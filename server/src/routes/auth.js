import { Router } from 'express'

const router = Router()

// POST /api/v1/auth/login
router.post('/login', (req, res) => {
  res.json({
    token: 'placeholder-jwt-token',
    user: { id: 1, username: 'admin', role: 'admin' },
  })
})

// POST /api/v1/auth/refresh
router.post('/refresh', (req, res) => {
  res.json({ token: 'placeholder-refreshed-token' })
})

export default router
