import { Router } from 'express'

const router = Router()

// GET /api/v1/files/
router.get('/', (req, res) => {
  res.json({
    path: '/',
    items: [
      { name: 'Documents', type: 'directory', modified: '2026-02-17T10:00:00Z' },
      { name: 'Photos', type: 'directory', modified: '2026-02-16T15:30:00Z' },
      { name: 'report.pdf', type: 'file', size: 245000, modified: '2026-02-17T09:00:00Z' },
    ],
  })
})

// GET /api/v1/files/:path (single segment)
router.get('/:path', (req, res) => {
  res.json({
    path: req.params.path,
    items: [],
  })
})

// POST /api/v1/files/upload
router.post('/upload', (req, res) => {
  res.json({ message: 'Upload endpoint placeholder', success: true })
})

// DELETE /api/v1/files/:path
router.delete('/:path', (req, res) => {
  res.json({ message: 'File deleted', path: req.params.path })
})

export default router
