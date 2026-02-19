import { Router } from 'express'

const router = Router()

// In-memory store (will migrate to InfluxDB later)
const MAX_HISTORY = 2880 // 24 hours at 30s intervals
let latestReading = null
const history = []

// ---- Daily rain totalizer ----
const rainState = {
  daily_ml: 0,          // Accumulated ml today
  daily_clicks: 0,      // Accumulated clicks today
  last_reset: new Date().toISOString(),
  last_esp_clicks: null, // Track ESP32 cumulative clicks to compute deltas
}

// Auto-reset at midnight (checked on each ingest)
function checkDailyReset() {
  const now = new Date()
  const lastReset = new Date(rainState.last_reset)
  if (now.toDateString() !== lastReset.toDateString()) {
    console.log(`[WX] Daily rain reset: ${rainState.daily_ml} ml → 0`)
    rainState.daily_ml = 0
    rainState.daily_clicks = 0
    rainState.last_reset = now.toISOString()
    rainState.last_esp_clicks = null // Re-sync with ESP32
  }
}

function validateReading(data) {
  const errors = []
  if (data.temperature_c != null && (data.temperature_c < -40 || data.temperature_c > 60)) {
    errors.push('temperature_c out of range (-40 to 60)')
  }
  if (data.humidity_pct != null && (data.humidity_pct < 0 || data.humidity_pct > 100)) {
    errors.push('humidity_pct out of range (0 to 100)')
  }
  if (data.pressure_hpa != null && (data.pressure_hpa < 300 || data.pressure_hpa > 1100)) {
    errors.push('pressure_hpa out of range (300 to 1100)')
  }
  return errors
}

// POST /api/v1/weather/ingest (API key auth)
router.post('/ingest', (req, res) => {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) {
    return res.status(401).json({ message: 'X-API-Key header required' })
  }

  const data = req.body
  if (!data.station_id) {
    return res.status(400).json({ message: 'station_id is required' })
  }

  // Validate ranges per FSD WX-004
  const errors = validateReading(data)
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors })
  }

  // Check for midnight rollover
  checkDailyReset()

  // Accumulate rain from ESP32 delta clicks
  const espClicks = data.rain_clicks ?? 0
  const deltaClicks = data.rain_delta_clicks ?? 0
  const mlPerClick = 4.0 // Must match ESP32 config

  if (rainState.last_esp_clicks === null) {
    // First reading after boot/reset — use delta from ESP32
    rainState.daily_clicks += deltaClicks
    rainState.daily_ml += deltaClicks * mlPerClick
  } else {
    // Use delta reported by ESP32
    rainState.daily_clicks += deltaClicks
    rainState.daily_ml += deltaClicks * mlPerClick
  }
  rainState.last_esp_clicks = espClicks

  const reading = {
    station_id: data.station_id,
    timestamp: data.timestamp || new Date().toISOString(),
    temperature_c: data.temperature_c ?? null,
    humidity_pct: data.humidity_pct ?? null,
    pressure_hpa: data.pressure_hpa ?? null,
    wind_speed_kmh: data.wind_speed_kmh ?? 0,
    wind_direction_deg: data.wind_direction_deg ?? 0,
    rainfall_ml: data.rainfall_ml ?? 0,
    rain_daily_ml: Math.round(rainState.daily_ml * 10) / 10,
    rain_daily_clicks: rainState.daily_clicks,
    battery_v: data.battery_v ?? null,
    received_at: new Date().toISOString(),
  }

  latestReading = reading
  history.push(reading)

  // Trim history to max size
  while (history.length > MAX_HISTORY) {
    history.shift()
  }

  console.log(`[WX] ${reading.station_id}: ${reading.temperature_c}°C, ${reading.humidity_pct}% RH, ${reading.pressure_hpa} hPa, rain ${rainState.daily_ml} ml (${rainState.daily_clicks} clicks), bat ${reading.battery_v}V`)

  res.json({ message: 'Data ingested', success: true })
})

// GET /api/v1/weather/current
router.get('/current', (req, res) => {
  if (!latestReading) {
    return res.json({
      station_id: null,
      message: 'No data received yet. Waiting for ESP32...',
    })
  }
  // Always return fresh rain totals (may have been zeroed since last ingest)
  res.json({
    ...latestReading,
    rain_daily_ml: Math.round(rainState.daily_ml * 10) / 10,
    rain_daily_clicks: rainState.daily_clicks,
    rain_last_reset: rainState.last_reset,
  })
})

// POST /api/v1/weather/rain-reset (manual zero for testing/calibration)
router.post('/rain-reset', (req, res) => {
  const prev = { daily_ml: rainState.daily_ml, daily_clicks: rainState.daily_clicks }
  rainState.daily_ml = 0
  rainState.daily_clicks = 0
  rainState.last_reset = new Date().toISOString()
  rainState.last_esp_clicks = null // Re-sync on next ingest
  console.log(`[WX] Manual rain reset: ${prev.daily_ml} ml (${prev.daily_clicks} clicks) → 0`)
  res.json({
    message: 'Rain totalizer zeroed',
    previous: prev,
    reset_at: rainState.last_reset,
  })
})

// GET /api/v1/weather/history
router.get('/history', (req, res) => {
  const station = req.query.station || 'wx-station-01'
  const limit = parseInt(req.query.limit) || 100

  const filtered = history
    .filter(r => r.station_id === station)
    .slice(-limit)

  res.json({
    station,
    count: filtered.length,
    data: filtered,
  })
})

export default router
