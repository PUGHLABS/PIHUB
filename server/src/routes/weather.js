import { Router } from 'express'
import { getDb } from '../db/sqlite.js'

const router = Router()

// In-memory cache of the latest reading (for fast /current responses)
let latestReading = null

// ---- Rain state (loaded from / persisted to SQLite) ----
const STATION_ID = 'wx-station-01'

function getRainState(stationId) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM rain_state WHERE station_id = ?').get(stationId)
  if (!row) {
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO rain_state (station_id, daily_clicks, last_reset, last_esp_clicks) VALUES (?, 0, ?, NULL)'
    ).run(stationId, now)
    return { station_id: stationId, daily_clicks: 0, last_reset: now, last_esp_clicks: null }
  }
  return row
}

function saveRainState(state) {
  const db = getDb()
  db.prepare(
    `INSERT INTO rain_state (station_id, daily_clicks, last_reset, last_esp_clicks)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(station_id) DO UPDATE SET
       daily_clicks = excluded.daily_clicks,
       last_reset = excluded.last_reset,
       last_esp_clicks = excluded.last_esp_clicks`
  ).run(state.station_id, state.daily_clicks, state.last_reset, state.last_esp_clicks ?? null)
}

function checkDailyReset(state) {
  const now = new Date()
  const lastReset = new Date(state.last_reset)
  if (now.toDateString() !== lastReset.toDateString()) {
    console.log(`[WX] Daily rain reset: ${state.daily_clicks} clicks → 0`)
    state.daily_clicks = 0
    state.last_reset = now.toISOString()
    state.last_esp_clicks = null
    saveRainState(state)
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

// Convert range string to a SQLite datetime expression
function rangeToSql(range) {
  const map = {
    '1h':  "datetime('now', '-1 hour')",
    '6h':  "datetime('now', '-6 hours')",
    '24h': "datetime('now', '-24 hours')",
    '7d':  "datetime('now', '-7 days')",
    '30d': "datetime('now', '-30 days')",
  }
  return map[range] ?? map['24h']
}

// Thin a large array down to at most maxPoints (evenly spaced)
function thin(arr, maxPoints) {
  if (arr.length <= maxPoints) return arr
  const step = arr.length / maxPoints
  const result = []
  for (let i = 0; i < maxPoints; i++) {
    result.push(arr[Math.floor(i * step)])
  }
  return result
}

// POST /api/v1/weather/ingest (API key auth)
router.post('/ingest', (req, res) => {
  const apiKey = req.headers['x-api-key']
  const expectedKey = process.env.WX_API_KEY
  if (!apiKey || (expectedKey && apiKey !== expectedKey)) {
    return res.status(401).json({ message: 'Invalid or missing X-API-Key' })
  }

  const data = req.body
  if (!data.station_id) {
    return res.status(400).json({ message: 'station_id is required' })
  }

  const errors = validateReading(data)
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors })
  }

  const db = getDb()
  const rainState = getRainState(data.station_id)
  checkDailyReset(rainState)

  const deltaClicks = data.rain_delta_clicks ?? 0
  rainState.daily_clicks += deltaClicks
  rainState.last_esp_clicks = data.rain_clicks ?? rainState.last_esp_clicks
  saveRainState(rainState)

  const reading = {
    station_id: data.station_id,
    timestamp: data.timestamp || new Date().toISOString(),
    temperature_c: data.temperature_c ?? null,
    humidity_pct: data.humidity_pct ?? null,
    pressure_hpa: data.pressure_hpa ?? null,
    wind_speed_kmh: data.wind_speed_kmh ?? 0,
    wind_direction_deg: data.wind_direction_deg ?? 0,
    rain_daily_clicks: rainState.daily_clicks,
    battery_v: data.battery_v ?? null,
    rain_last_reset: rainState.last_reset,
    received_at: new Date().toISOString(),
  }

  // Persist to SQLite
  db.prepare(
    `INSERT INTO weather_readings
      (station_id, timestamp, temperature_c, humidity_pct, pressure_hpa,
       wind_speed_kmh, wind_direction_deg, rain_daily_clicks, battery_v, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    reading.station_id, reading.timestamp, reading.temperature_c, reading.humidity_pct,
    reading.pressure_hpa, reading.wind_speed_kmh, reading.wind_direction_deg,
    reading.rain_daily_clicks, reading.battery_v, reading.received_at
  )

  // Purge readings older than 30 days
  db.prepare(
    `DELETE FROM weather_readings WHERE station_id = ? AND received_at < datetime('now', '-30 days')`
  ).run(data.station_id)

  latestReading = reading

  console.log(
    `[WX] ${reading.station_id}: ${reading.temperature_c}°C, ` +
    `${reading.humidity_pct}% RH, ${reading.pressure_hpa} hPa, ` +
    `rain ${rainState.daily_clicks} clicks`
  )

  res.json({ message: 'Data ingested', success: true })
})

// GET /api/v1/weather/current
router.get('/current', (req, res) => {
  // Try in-memory cache first, fall back to latest SQLite row
  if (!latestReading) {
    const db = getDb()
    const row = db.prepare(
      `SELECT * FROM weather_readings ORDER BY received_at DESC LIMIT 1`
    ).get()
    if (!row) {
      return res.json({ station_id: null, message: 'No data received yet. Waiting for ESP32...' })
    }
    latestReading = row
  }

  const rainState = getRainState(latestReading.station_id || STATION_ID)
  res.json({
    ...latestReading,
    rain_daily_clicks: rainState.daily_clicks,
    rain_last_reset: rainState.last_reset,
  })
})

// POST /api/v1/weather/rain-reset
router.post('/rain-reset', (req, res) => {
  const stationId = req.body?.station_id || STATION_ID
  const rainState = getRainState(stationId)
  const prev = { daily_clicks: rainState.daily_clicks }
  rainState.daily_clicks = 0
  rainState.last_reset = new Date().toISOString()
  rainState.last_esp_clicks = null
  saveRainState(rainState)
  console.log(`[WX] Manual rain reset: ${prev.daily_clicks} clicks → 0`)
  res.json({ message: 'Rain totalizer zeroed', previous: prev, reset_at: rainState.last_reset })
})

// GET /api/v1/weather/history?station=wx-station-01&range=24h&limit=200
router.get('/history', (req, res) => {
  const db = getDb()
  const station = req.query.station || STATION_ID
  const range = req.query.range || '24h'
  const maxPoints = Math.min(parseInt(req.query.limit) || 200, 500)

  const since = rangeToSql(range)
  const rows = db.prepare(
    `SELECT received_at as time, temperature_c, humidity_pct, pressure_hpa,
            wind_speed_kmh, wind_direction_deg, rain_daily_clicks, battery_v
     FROM weather_readings
     WHERE station_id = ? AND received_at >= ${since}
     ORDER BY received_at ASC`
  ).all(station)

  const data = thin(rows, maxPoints)

  res.json({ station, range, count: data.length, data })
})

// GET /api/v1/weather/stats?station=wx-station-01&range=24h
router.get('/stats', (req, res) => {
  const db = getDb()
  const station = req.query.station || STATION_ID
  const range = req.query.range || '24h'
  const since = rangeToSql(range)

  const row = db.prepare(
    `SELECT
       MIN(temperature_c) AS temp_min, MAX(temperature_c) AS temp_max, AVG(temperature_c) AS temp_avg,
       MIN(humidity_pct)  AS hum_min,  MAX(humidity_pct)  AS hum_max,  AVG(humidity_pct)  AS hum_avg,
       MIN(pressure_hpa)  AS pres_min, MAX(pressure_hpa)  AS pres_max, AVG(pressure_hpa)  AS pres_avg,
       MIN(wind_speed_kmh) AS wind_min, MAX(wind_speed_kmh) AS wind_max, AVG(wind_speed_kmh) AS wind_avg,
       MAX(rain_daily_clicks) AS rain_max_clicks,
       COUNT(*) AS sample_count
     FROM weather_readings
     WHERE station_id = ? AND received_at >= ${since}`
  ).get(station)

  const round = (v, d = 1) => v != null ? Math.round(v * 10 ** d) / 10 ** d : null

  res.json({
    station, range,
    samples: row.sample_count,
    temperature_c: { min: round(row.temp_min), max: round(row.temp_max), avg: round(row.temp_avg) },
    humidity_pct:  { min: round(row.hum_min),  max: round(row.hum_max),  avg: round(row.hum_avg)  },
    pressure_hpa:  { min: round(row.pres_min, 2), max: round(row.pres_max, 2), avg: round(row.pres_avg, 2) },
    wind_speed_kmh: { min: round(row.wind_min), max: round(row.wind_max), avg: round(row.wind_avg) },
    rain_daily_clicks: { max: row.rain_max_clicks },
  })
})

// GET /api/v1/weather/export?station=wx-station-01&range=24h&format=csv|json
router.get('/export', (req, res) => {
  const db = getDb()
  const station = req.query.station || STATION_ID
  const range = req.query.range || '24h'
  const format = req.query.format === 'json' ? 'json' : 'csv'
  const since = rangeToSql(range)

  const rows = db.prepare(
    `SELECT received_at, station_id, temperature_c, humidity_pct, pressure_hpa,
            wind_speed_kmh, wind_direction_deg, rain_daily_clicks, battery_v
     FROM weather_readings
     WHERE station_id = ? AND received_at >= ${since}
     ORDER BY received_at ASC`
  ).all(station)

  const filename = `weather-${station}-${range}-${new Date().toISOString().slice(0, 10)}`

  if (format === 'json') {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`)
    res.setHeader('Content-Type', 'application/json')
    return res.json({ station, range, exported_at: new Date().toISOString(), count: rows.length, data: rows })
  }

  // CSV
  const headers = ['received_at', 'station_id', 'temperature_c', 'humidity_pct', 'pressure_hpa',
                   'wind_speed_kmh', 'wind_direction_deg', 'rain_daily_clicks', 'battery_v']
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => r[h] ?? '').join(','))
  ].join('\n')

  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
  res.setHeader('Content-Type', 'text/csv')
  res.send(csv)
})

export default router
