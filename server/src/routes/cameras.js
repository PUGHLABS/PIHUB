import { Router } from 'express'

const router = Router()

// GET /api/v1/cameras
router.get('/', (req, res) => {
  res.json({
    cameras: [
      { id: 1, name: 'Front Door', location: 'Entrance', status: 'online', rtsp_url: null },
      { id: 2, name: 'Backyard', location: 'Garden', status: 'online', rtsp_url: null },
    ],
  })
})

// GET /api/v1/cameras/:id/stream
router.get('/:id/stream', (req, res) => {
  res.json({ camera_id: req.params.id, stream_url: null, message: 'Stream endpoint placeholder' })
})

// GET /api/v1/cameras/:id/recordings
router.get('/:id/recordings', (req, res) => {
  res.json({ camera_id: req.params.id, recordings: [] })
})

export default router
