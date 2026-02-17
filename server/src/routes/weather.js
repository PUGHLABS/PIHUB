import { Router } from 'express'

const router = Router()

// POST /api/v1/weather/ingest (API key auth, not JWT)
router.post('/ingest', (req, res) => {
  res.json({ message: 'Data ingested', success: true })
})

// GET /api/v1/weather/current
router.get('/current', (req, res) => {
  res.json({
    station_id: 'wx-station-01',
    timestamp: new Date().toISOString(),
    temperature_c: 22.5,
    humidity_pct: 65.2,
    pressure_hpa: 1013.25,
    wind_speed_kmh: 12.3,
    wind_direction_deg: 225,
    rainfall_mm: 0.0,
    battery_v: 3.72,
  })
})

// GET /api/v1/weather/history
router.get('/history', (req, res) => {
  res.json({
    station: req.query.station || 'wx-station-01',
    from: req.query.from,
    to: req.query.to,
    data: [],
  })
})

export default router
