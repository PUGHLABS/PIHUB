import { Router } from 'express'
import { requireAuth, requireAuthMedia } from '../middleware/auth.js'
import { resolveSafePath, ensureDir, listDirectory, isValidName } from '../lib/fileBrowser.js'

const MEDIA_BASE = process.env.MEDIA_PATH || '/mnt/nas/media'

try {
  ensureDir(MEDIA_BASE)
} catch (err) {
  console.error(`[MEDIA] Storage unavailable (${err.message}) — media will not be accessible until NAS is mounted`)
}

const router = Router()

// GET /api/v1/media?path=movies
router.get('/', requireAuth, (req, res) => {
  try {
    const dir = resolveSafePath(MEDIA_BASE, req.query.path || '')
    res.json({ path: req.query.path || '', items: listDirectory(dir) })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// POST /api/v1/media/mkdir  { path: 'movies', name: 'New Folder' }
router.post('/mkdir', requireAuth, (req, res) => {
  const { path: dirPath, name } = req.body
  if (!isValidName(name)) return res.status(400).json({ message: 'Invalid folder name' })
  try {
    const target = resolveSafePath(MEDIA_BASE, dirPath ? `${dirPath}/${name}` : name)
    ensureDir(target)
    res.status(201).json({ message: 'Folder created', name })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// GET /api/v1/media/stream?path=movies/file.mp4
// res.sendFile honors Range headers automatically, so <video>/<audio> seeking works.
router.get('/stream', requireAuthMedia, (req, res) => {
  if (!req.query.path) return res.status(400).json({ message: 'path is required' })
  try {
    const filePath = resolveSafePath(MEDIA_BASE, req.query.path)
    res.sendFile(filePath, err => {
      if (err && !res.headersSent) {
        res.status(404).json({ message: 'File not found on disk' })
      }
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

export default router
