import { spawn } from 'child_process'
import { mkdirSync, watch, statSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getDb } from '../db/sqlite.js'

// ── Config ────────────────────────────────────────────────────────────────────
const NAS_BASE = process.env.CAMERAS_PATH || '/mnt/nas/cameras'
const HLS_DIR = join(NAS_BASE, 'hls')
const REC_DIR = join(NAS_BASE, 'recordings')
const THM_DIR = join(NAS_BASE, 'thumbnails')

// Per-camera process state: { recorder, streamer, motionDetector, restartTimers, watchers, lastSeen }
const state = new Map()

// ── Helpers ───────────────────────────────────────────────────────────────────
function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

function padded(n) {
  return String(n).padStart(2, '0')
}

function todayDir(cameraId) {
  const d = new Date()
  const date = `${d.getFullYear()}-${padded(d.getMonth() + 1)}-${padded(d.getDate())}`
  const dir = join(REC_DIR, cameraId, date)
  ensureDir(dir)
  return dir
}

function log(cameraId, msg) {
  console.log(`[CAM:${cameraId}] ${msg}`)
}

// ── FFmpeg process spawner ────────────────────────────────────────────────────
function spawnFfmpeg(cameraId, label, args, onExit) {
  const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })

  proc.stderr.on('data', (data) => {
    // Only log errors and key info lines, not every frame
    const line = data.toString()
    if (line.includes('Error') || line.includes('error') || line.includes('Opening')) {
      log(cameraId, `[${label}] ${line.trim()}`)
    }
  })

  proc.on('exit', (code, signal) => {
    log(cameraId, `[${label}] exited (code=${code}, signal=${signal})`)
    onExit(code, signal)
  })

  return proc
}

// ── Start a single camera ─────────────────────────────────────────────────────
function startCamera(camera) {
  const { id, rtsp_main, rtsp_sub } = camera

  if (state.has(id)) {
    stopCamera(id)
  }

  const cam = {
    recorder: null,
    streamer: null,
    motionDetector: null,
    restartTimers: [],
    watchers: [],
    scanIntervals: [],
    lastSeen: null,
  }
  state.set(id, cam)

  const hlsDir = join(HLS_DIR, id)
  const thmDir = join(THM_DIR, id)
  ensureDir(hlsDir)
  ensureDir(thmDir)

  // ── 1. Continuous recorder (main stream, copy mode) ──────────────────────
  function startRecorder(delay = 0) {
    const timer = setTimeout(() => {
      const dir = todayDir(id)
      const pattern = join(dir, '%H-%M-%S.mp4')

      cam.recorder = spawnFfmpeg(id, 'recorder', [
        '-rtsp_transport', 'tcp',
        '-i', rtsp_main,
        '-c', 'copy',
        '-f', 'segment',
        '-segment_time', '900',
        '-segment_atclocktime', '1',
        '-reset_timestamps', '1',
        '-strftime', '1',
        pattern,
      ], (code) => {
        if (state.has(id)) {
          const backoff = Math.min(delay * 2 || 5, 60)
          log(id, `Recorder restart in ${backoff}s`)
          startRecorder(backoff)
        }
      })

      cam.lastSeen = new Date()
      log(id, 'Recorder started')
    }, delay * 1000)

    cam.restartTimers.push(timer)
  }

  // ── 2. HLS live streamer (sub stream) ────────────────────────────────────
  function startStreamer(delay = 0) {
    const timer = setTimeout(() => {
      const playlist = join(hlsDir, 'live.m3u8')

      cam.streamer = spawnFfmpeg(id, 'streamer', [
        '-rtsp_transport', 'tcp',
        '-i', rtsp_sub,
        '-c', 'copy',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '5',
        '-hls_flags', 'delete_segments+omit_endlist',
        playlist,
      ], (code) => {
        if (state.has(id)) {
          const backoff = Math.min(delay * 2 || 5, 60)
          log(id, `Streamer restart in ${backoff}s`)
          startStreamer(backoff)
        }
      })

      log(id, 'HLS streamer started')
    }, delay * 1000)

    cam.restartTimers.push(timer)
  }

  // ── 3. Motion detector (sub stream, scene-change filter) ─────────────────
  function startMotionDetector(delay = 0) {
    const timer = setTimeout(() => {
      const thmPattern = join(thmDir, 'thumb-%09d.jpg')

      cam.motionDetector = spawnFfmpeg(id, 'motion', [
        '-rtsp_transport', 'tcp',
        '-i', rtsp_sub,
        '-vf', 'select=gt(scene\\,0.1),scale=320:180',
        '-vsync', 'vfr',
        '-qscale:v', '5',
        thmPattern,
      ], (code) => {
        if (state.has(id)) {
          const backoff = Math.min(delay * 2 || 5, 60)
          log(id, `Motion detector restart in ${backoff}s`)
          startMotionDetector(backoff)
        }
      })

      // Watch thumbnail dir for new files → write motion_event row
      try {
        const watcher = watch(thmDir, (eventType, filename) => {
          if (eventType === 'rename' && filename?.endsWith('.jpg')) {
            const fullPath = join(thmDir, filename)
            try {
              statSync(fullPath) // only if file exists (not deleted)
              const db = getDb()
              db.prepare(
                `INSERT INTO motion_events (camera_id, detected_at, thumbnail_path, score)
                 VALUES (?, ?, ?, ?)`
              ).run(id, new Date().toISOString(), fullPath, null)
            } catch {
              // File may have been written then immediately deleted — ignore
            }
          }
        })
        cam.watchers.push(watcher)
      } catch (err) {
        log(id, `Thumbnail watcher error: ${err.message}`)
      }

      log(id, 'Motion detector started')
    }, delay * 1000)

    cam.restartTimers.push(timer)
  }

  // ── 4. Periodic recording scanner ─────────────────────────────────────────
  // FFmpeg creates .mp4 files on disk; this scanner syncs them into the DB
  function syncRecordings() {
    const camRecDir = join(REC_DIR, id)
    const db = getDb()
    try {
      const dateDirs = readdirSync(camRecDir)
      for (const dateDir of dateDirs) {
        const fullDateDir = join(camRecDir, dateDir)
        let files
        try { files = readdirSync(fullDateDir).filter(f => f.endsWith('.mp4')) } catch { continue }
        for (const file of files) {
          const fullPath = join(fullDateDir, file)
          try {
            const stat = statSync(fullPath)
            if (stat.size < 65536) continue // skip tiny/incomplete files (<64KB)
            const existing = db.prepare('SELECT id FROM recordings WHERE file_path = ?').get(fullPath)
            if (!existing) {
              // Filename is HH-MM-SS.mp4; dateDir is YYYY-MM-DD
              const match = file.match(/^(\d{2})-(\d{2})-(\d{2})\.mp4$/)
              const startedAt = match
                ? `${dateDir}T${match[1]}:${match[2]}:${match[3]}`
                : new Date().toISOString()
              db.prepare(
                'INSERT OR IGNORE INTO recordings (camera_id, started_at, file_path, size_bytes) VALUES (?, ?, ?, ?)'
              ).run(id, startedAt, fullPath, stat.size)
              log(id, `Indexed recording: ${dateDir}/${file}`)
            } else {
              // Keep size up to date for the currently-writing file
              db.prepare('UPDATE recordings SET size_bytes = ? WHERE file_path = ?')
                .run(stat.size, fullPath)
            }
          } catch { /* file may be locked/deleted */ }
        }
      }
    } catch { /* no recordings dir yet */ }
  }

  // Scan once after 30s (let FFmpeg write the first segment) then every 5 min
  cam.scanIntervals.push(setTimeout(syncRecordings, 30_000))
  cam.scanIntervals.push(setInterval(syncRecordings, 5 * 60 * 1000))

  startRecorder()
  startStreamer()
  startMotionDetector()
}

// ── Stop a single camera ──────────────────────────────────────────────────────
function stopCamera(id) {
  const cam = state.get(id)
  if (!cam) return

  for (const timer of cam.restartTimers) clearTimeout(timer)
  for (const t of cam.scanIntervals) { clearTimeout(t); clearInterval(t) }
  for (const w of cam.watchers) { try { w.close() } catch {} }

  for (const proc of [cam.recorder, cam.streamer, cam.motionDetector]) {
    if (proc && !proc.killed) {
      try { proc.kill('SIGTERM') } catch {}
    }
  }

  state.delete(id)
  log(id, 'Stopped')
}

// ── Retention cleanup ─────────────────────────────────────────────────────────
function runRetentionCleanup() {
  const db = getDb()
  const cameras = db.prepare('SELECT id, retention_days FROM cameras WHERE enabled = 1').all()

  for (const cam of cameras) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - cam.retention_days)
    const cutoffStr = cutoff.toISOString()

    const old = db.prepare(
      `SELECT id, file_path FROM recordings WHERE camera_id = ? AND started_at < ?`
    ).all(cam.id, cutoffStr)

    for (const rec of old) {
      try { unlinkSync(rec.file_path) } catch {}
      db.prepare('DELETE FROM recordings WHERE id = ?').run(rec.id)
    }

    if (old.length > 0) {
      log(cam.id, `Retention: deleted ${old.length} old segment(s)`)
    }

    // Also prune motion events older than retention window
    db.prepare(
      `DELETE FROM motion_events WHERE camera_id = ? AND detected_at < ?`
    ).run(cam.id, cutoffStr)

    // Clean up thumbnail files for deleted events
    try {
      const thumbFiles = readdirSync(join(THM_DIR, cam.id))
      const kept = db.prepare(
        `SELECT thumbnail_path FROM motion_events WHERE camera_id = ?`
      ).all(cam.id).map(r => r.thumbnail_path)

      for (const f of thumbFiles) {
        const fullPath = join(THM_DIR, cam.id, f)
        if (!kept.includes(fullPath)) {
          try { unlinkSync(fullPath) } catch {}
        }
      }
    } catch {}
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export function startAll() {
  const db = getDb()
  const cameras = db.prepare('SELECT * FROM cameras WHERE enabled = 1').all()

  try {
    ensureDir(HLS_DIR)
    ensureDir(REC_DIR)
    ensureDir(THM_DIR)
  } catch (err) {
    console.error(`[CAM] NAS dirs unavailable (${err.message}) — cameras will not start until NAS is mounted`)
    return
  }

  for (const camera of cameras) {
    try {
      startCamera(camera)
    } catch (err) {
      log(camera.id, `Failed to start: ${err.message}`)
    }
  }

  // Run retention cleanup daily
  setInterval(runRetentionCleanup, 24 * 60 * 60 * 1000)
  // Also run once shortly after startup
  setTimeout(runRetentionCleanup, 60 * 1000)

  console.log(`[CAM] Started ${cameras.length} camera(s)`)
}

export function start(camera) {
  startCamera(camera)
}

export function stop(cameraId) {
  stopCamera(cameraId)
}

export function getStatus(cameraId) {
  const cam = state.get(cameraId)
  if (!cam) return { recording: false, streaming: false, online: false, lastSeen: null }
  return {
    recording: cam.recorder != null && !cam.recorder.killed,
    streaming: cam.streamer != null && !cam.streamer.killed,
    online: cam.lastSeen != null,
    lastSeen: cam.lastSeen,
  }
}

export function getHlsDir(cameraId) {
  return join(HLS_DIR, cameraId)
}

export function getLatestThumbnail(cameraId) {
  const dir = join(THM_DIR, cameraId)
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.jpg')).sort()
    return files.length > 0 ? join(dir, files[files.length - 1]) : null
  } catch {
    return null
  }
}

// Cache: { path, capturedAt }
const snapshotCache = new Map()
const SNAP_CACHE_TTL_MS = 30_000 // reuse for 30 seconds

export function captureSnapshot(cameraId) {
  return new Promise((resolve, reject) => {
    // Return cached snapshot if fresh enough
    const cached = snapshotCache.get(cameraId)
    if (cached && Date.now() - cached.capturedAt < SNAP_CACHE_TTL_MS) {
      return resolve(cached.path)
    }

    const db = getDb()
    const camera = db.prepare('SELECT rtsp_sub FROM cameras WHERE id = ?').get(cameraId)
    if (!camera) return reject(new Error('Camera not found'))

    const outPath = join(tmpdir(), `pivault-snap-${cameraId}.jpg`)
    const ffmpeg = spawn('ffmpeg', [
      '-rtsp_transport', 'tcp',
      '-i', camera.rtsp_sub,
      '-vframes', '1',
      '-qscale:v', '3',
      '-y',
      outPath,
    ], { stdio: ['ignore', 'ignore', 'pipe'] })

    const timer = setTimeout(() => {
      ffmpeg.kill('SIGKILL')
      reject(new Error('Snapshot timed out'))
    }, 8000)

    ffmpeg.on('exit', () => {
      clearTimeout(timer)
      // Check file existence/size — ffmpeg -vframes 1 can exit non-zero even on success
      try {
        const stat = statSync(outPath)
        if (stat.size > 0) {
          snapshotCache.set(cameraId, { path: outPath, capturedAt: Date.now() })
          return resolve(outPath)
        }
      } catch { /* file not written */ }
      reject(new Error('Snapshot file not written'))
    })
  })
}
