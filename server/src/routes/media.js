import { Router } from 'express'

const router = Router()

// GET /api/v1/media/search
router.get('/search', (req, res) => {
  res.json({
    query: req.query.q || '',
    results: [],
    total: 0,
  })
})

// GET /api/v1/media/:id/stream
router.get('/:id/stream', (req, res) => {
  res.json({ media_id: req.params.id, stream_url: null, message: 'Stream endpoint placeholder' })
})

export default router
