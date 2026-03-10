import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/v1/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' })
  }

  if (username !== config.adminUsername || password !== config.adminPassword) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const token = jwt.sign(
    { userId: 1, username, role: 'admin' },
    config.jwtSecret,
    { expiresIn: config.jwtExpiry }
  )

  res.json({ token, user: { id: 1, username, role: 'admin' } })
})

// GET /api/v1/auth/me  — verify token + return current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
