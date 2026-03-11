import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  try {
    const token = header.slice(7)
    req.user = jwt.verify(token, config.jwtSecret)
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

// For image/media endpoints that <img> tags hit without auth headers.
// Accepts ?token= query param as fallback (in addition to Bearer header).
export function requireAuthMedia(req, res, next) {
  const raw = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : req.query.token

  if (!raw) return res.status(401).json({ message: 'Authentication required' })

  try {
    req.user = jwt.verify(raw, config.jwtSecret)
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}
