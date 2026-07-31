import { Router } from 'express'
import multer from 'multer'
import { basename } from 'path'
import { requireAuth, requireAuthMedia } from '../middleware/auth.js'
import { resolveSafePath, ensureDir, listDirectory, deleteEntry, isValidName } from '../lib/fileBrowser.js'

const FILES_BASE = process.env.FILES_PATH || '/mnt/nas/nas/shared'

try {
  ensureDir(FILES_BASE)
} catch (err) {
  console.error(`[FILES] Storage unavailable (${err.message}) — files will not be accessible until NAS is mounted`)
}

const router = Router()

const upload = multer({
  limits: { fileSize: 4 * 1024 ** 3 },
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const dir = resolveSafePath(FILES_BASE, req.query.path || '')
        ensureDir(dir)
        cb(null, dir)
      } catch (err) {
        cb(err)
      }
    },
    filename: (req, file, cb) => {
      cb(null, basename(file.originalname))
    },
  }),
})

// GET /api/v1/files?path=sub/dir
router.get('/', requireAuth, (req, res) => {
  try {
    const dir = resolveSafePath(FILES_BASE, req.query.path || '')
    res.json({ path: req.query.path || '', items: listDirectory(dir) })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// POST /api/v1/files/upload?path=sub/dir
router.post('/upload', requireAuth, (req, res) => {
  upload.array('files')(req, res, err => {
    if (err) return res.status(400).json({ message: err.message })
    res.status(201).json({
      uploaded: (req.files || []).map(f => ({ name: f.filename, size: f.size })),
    })
  })
})

// POST /api/v1/files/mkdir  { path: 'sub/dir', name: 'New Folder' }
router.post('/mkdir', requireAuth, (req, res) => {
  const { path: dirPath, name } = req.body
  if (!isValidName(name)) return res.status(400).json({ message: 'Invalid folder name' })
  try {
    const target = resolveSafePath(FILES_BASE, dirPath ? `${dirPath}/${name}` : name)
    ensureDir(target)
    res.status(201).json({ message: 'Folder created', name })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// GET /api/v1/files/download?path=sub/dir/file.ext
router.get('/download', requireAuthMedia, (req, res) => {
  if (!req.query.path) return res.status(400).json({ message: 'path is required' })
  try {
    const filePath = resolveSafePath(FILES_BASE, req.query.path)
    res.download(filePath, basename(filePath), err => {
      if (err && !res.headersSent) {
        res.status(404).json({ message: 'File not found on disk' })
      }
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE /api/v1/files?path=sub/dir/file.ext
router.delete('/', requireAuth, (req, res) => {
  if (!req.query.path) return res.status(400).json({ message: 'path is required' })
  try {
    const target = resolveSafePath(FILES_BASE, req.query.path)
    deleteEntry(target)
    res.json({ message: 'Deleted', path: req.query.path })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

export default router
