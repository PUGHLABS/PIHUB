import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import filesRoutes from './routes/files.js'
import weatherRoutes from './routes/weather.js'
import camerasRoutes from './routes/cameras.js'
import mediaRoutes from './routes/media.js'
import systemRoutes from './routes/system.js'
import { getDb } from './db/sqlite.js'
import { startAll as startAllCameras } from './services/cameraManager.js'

const app = express()

// Initialize DB (ensures schema is applied) then start camera processes
try {
  getDb()
  startAllCameras()
} catch (err) {
  console.error('[APP] Camera startup error:', err.message)
}

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())

// Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/files', filesRoutes)
app.use('/api/v1/weather', weatherRoutes)
app.use('/api/v1/cameras', camerasRoutes)
app.use('/api/v1/media', mediaRoutes)
app.use('/api/v1/system', systemRoutes)

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use(errorHandler)

export default app
