import { Router } from 'express'
import { join } from 'path'
import { statSync } from 'fs'
import { getDb } from '../db/sqlite.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import * as cameraManager from '../services/cameraManager.js'

const router = Router()

// ── Helpers ───────────────────────────────────────────────────────────────────
function cameraNotFound(res) {
  return res.status(404).json({ message: 'Camera not found' })
}

// ── Camera CRUD ───────────────────────────────────────────────────────────────

// GET /api/v1/cameras
router.get('/', requireAuth, (req, res) => {
  const db = getDb()
  const cameras = db.prepare('SELECT * FROM cameras ORDER BY name').all()
  const result = cameras.map(cam => ({ ...cam, status: cameraManager.getStatus(cam.id) }))
  res.json({ cameras: result })
})

// POST /api/v1/cameras
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { id, name, location, rtsp_main, rtsp_sub, retention_days } = req.body
  if (!id || !name || !rtsp_main || !rtsp_sub) {
    return res.status(400).json({ message: 'id, name, rtsp_main, and rtsp_sub are required' })
  }
  const db = getDb()
  try {
    db.prepare(
      `INSERT INTO cameras (id, name, location, rtsp_main, rtsp_sub, retention_days)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name, location || null, rtsp_main, rtsp_sub, retention_days ?? 14)
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ message: `Camera id '${id}' already exists` })
    }
    throw err
  }
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(id)
  if (camera.enabled) cameraManager.start(camera)
  res.status(201).json(camera)
})

// GET /api/v1/cameras/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb()
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id)
  if (!camera) return cameraNotFound(res)
  res.json({ ...camera, status: cameraManager.getStatus(camera.id) })
})

// PUT /api/v1/cameras/:id
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = getDb()
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id)
  if (!camera) return cameraNotFound(res)

  const { name, location, rtsp_main, rtsp_sub, enabled, retention_days } = req.body
  db.prepare(
    `UPDATE cameras
     SET name           = COALESCE(?, name),
         location       = COALESCE(?, location),
         rtsp_main      = COALESCE(?, rtsp_main),
         rtsp_sub       = COALESCE(?, rtsp_sub),
         enabled        = COALESCE(?, enabled),
         retention_days = COALESCE(?, retention_days)
     WHERE id = ?`
  ).run(name ?? null, location ?? null, rtsp_main ?? null, rtsp_sub ?? null,
        enabled ?? null, retention_days ?? null, req.params.id)

  const updated = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id)

  // Restart with new config if the camera process is running (or newly enabled)
  cameraManager.stop(req.params.id)
  if (updated.enabled) cameraManager.start(updated)

  res.json({ ...updated, status: cameraManager.getStatus(updated.id) })
})

// DELETE /api/v1/cameras/:id
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = getDb()
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id)
  if (!camera) return cameraNotFound(res)
  cameraManager.stop(req.params.id)
  db.prepare('DELETE FROM cameras WHERE id = ?').run(req.params.id)
  res.json({ message: 'Camera removed' })
})

// ── Process control ───────────────────────────────────────────────────────────

// POST /api/v1/cameras/:id/start
router.post('/:id/start', requireAuth, requireAdmin, (req, res) => {
  const db = getDb()
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id)
  if (!camera) return cameraNotFound(res)
  cameraManager.start(camera)
  res.json({ message: 'Camera started', status: cameraManager.getStatus(req.params.id) })
})

// POST /api/v1/cameras/:id/stop
router.post('/:id/stop', requireAuth, requireAdmin, (req, res) => {
  cameraManager.stop(req.params.id)
  res.json({ message: 'Camera stopped' })
})

// GET /api/v1/cameras/:id/status
router.get('/:id/status', requireAuth, (req, res) => {
  res.json(cameraManager.getStatus(req.params.id))
})

// ── HLS streaming ─────────────────────────────────────────────────────────────

// GET /api/v1/cameras/:id/hls/:filename
// Serves .m3u8 playlist and .ts segments for live view
router.get('/:id/hls/:filename', requireAuth, (req, res) => {
  const hlsDir = cameraManager.getHlsDir(req.params.id)
  const filename = req.params.filename

  // Prevent path traversal
  if (filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ message: 'Invalid filename' })
  }

  const filePath = join(hlsDir, filename)
  try {
    statSync(filePath)
    res.sendFile(filePath)
  } catch {
    res.status(404).json({ message: 'HLS file not found' })
  }
})

// ── Snapshot ──────────────────────────────────────────────────────────────────

// GET /api/v1/cameras/:id/snapshot
// Returns latest motion thumbnail instantly, or captures a live frame on demand
router.get('/:id/snapshot', requireAuth, async (req, res) => {
  // Prefer existing thumbnail (no extra FFmpeg call)
  const thumb = cameraManager.getLatestThumbnail(req.params.id)
  if (thumb) return res.sendFile(thumb)

  // Fall back to on-demand capture from sub-stream
  try {
    const snapPath = await cameraManager.captureSnapshot(req.params.id)
    res.sendFile(snapPath)
  } catch (err) {
    res.status(503).json({ message: 'Snapshot not available', detail: err.message })
  }
})

// ── Recordings ────────────────────────────────────────────────────────────────

// GET /api/v1/cameras/:id/recordings?date=YYYY-MM-DD&limit=100
router.get('/:id/recordings', requireAuth, (req, res) => {
  const db = getDb()
  const limit = Math.min(Number(req.query.limit) || 100, 500)
  const { date } = req.query

  const rows = date
    ? db.prepare(
        `SELECT * FROM recordings
         WHERE camera_id = ? AND started_at LIKE ?
         ORDER BY started_at DESC LIMIT ?`
      ).all(req.params.id, `${date}%`, limit)
    : db.prepare(
        `SELECT * FROM recordings
         WHERE camera_id = ?
         ORDER BY started_at DESC LIMIT ?`
      ).all(req.params.id, limit)

  res.json({ recordings: rows })
})

// GET /api/v1/cameras/:id/recordings/:recId/file
router.get('/:id/recordings/:recId/file', requireAuth, (req, res) => {
  const db = getDb()
  const rec = db.prepare(
    'SELECT * FROM recordings WHERE id = ? AND camera_id = ?'
  ).get(req.params.recId, req.params.id)

  if (!rec) return res.status(404).json({ message: 'Recording not found' })

  res.sendFile(rec.file_path, err => {
    if (err && !res.headersSent) {
      res.status(404).json({ message: 'Recording file not found on disk' })
    }
  })
})

// ── Motion events ─────────────────────────────────────────────────────────────

// GET /api/v1/cameras/:id/motion?from=ISO&to=ISO&limit=50
router.get('/:id/motion', requireAuth, (req, res) => {
  const db = getDb()
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const { from, to } = req.query

  const rows = (from && to)
    ? db.prepare(
        `SELECT * FROM motion_events
         WHERE camera_id = ? AND detected_at >= ? AND detected_at <= ?
         ORDER BY detected_at DESC LIMIT ?`
      ).all(req.params.id, from, to, limit)
    : db.prepare(
        `SELECT * FROM motion_events
         WHERE camera_id = ?
         ORDER BY detected_at DESC LIMIT ?`
      ).all(req.params.id, limit)

  res.json({ events: rows })
})

export default router
