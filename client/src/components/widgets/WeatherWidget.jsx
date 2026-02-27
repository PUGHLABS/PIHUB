import { useState } from 'react'
import useWeather from '../../hooks/useWeather'
import Skeleton from '../ui/Skeleton'
import { HiOutlineStatusOffline } from 'react-icons/hi'

function WeatherRow({ label, value, unit }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[var(--neu-text-muted)]">{label}</span>
      <span className="font-bold">
        {value != null ? `${value}${unit}` : '—'}
      </span>
    </div>
  )
}

function BatteryIndicator({ voltage }) {
  if (voltage == null) return null
  // Rough 18650 mapping: 3.0V = 0%, 4.2V = 100%
  const percent = Math.max(0, Math.min(100, ((voltage - 3.0) / 1.2) * 100))
  const color = percent < 20 ? '#ef4444' : percent < 50 ? '#f59e0b' : '#22c55e'

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--neu-text-muted)]">
      <div className="flex items-center gap-1">
        <div className="w-6 h-3 border border-current rounded-sm relative">
          <div
            className="absolute inset-0.5 rounded-xs"
            style={{ width: `${percent}%`, backgroundColor: color }}
          />
        </div>
        <div className="w-0.5 h-1.5 bg-current rounded-r-sm" />
      </div>
      <span>{voltage.toFixed(2)}V</span>
    </div>
  )
}

function RainSection({ dailyClicks, lastReset }) {
  const [zeroing, setZeroing] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [mlPerClick, setMlPerClick] = useState(() => {
    const stored = localStorage.getItem('rain_ml_per_click')
    return stored ? parseFloat(stored) : 4.25
  })
  const [calInput, setCalInput] = useState('')

  function openCal() {
    setCalInput(mlPerClick.toFixed(1))
    setCalOpen(true)
  }

  function saveCal() {
    const val = parseFloat(calInput)
    if (!isNaN(val) && val > 0) {
      localStorage.setItem('rain_ml_per_click', val.toString())
      setMlPerClick(val)
    }
    setCalOpen(false)
  }

  async function handleZero() {
    if (!confirm('Zero the daily rain totalizer?')) return
    setZeroing(true)
    try {
      const res = await fetch('/api/v1/weather/rain-reset', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      console.error('Rain reset failed:', err)
    } finally {
      setZeroing(false)
    }
  }

  const displayMl = ((dailyClicks ?? 0) * mlPerClick).toFixed(1)

  const resetTime = lastReset
    ? new Date(lastReset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="mt-3 pt-3 border-t border-[var(--neu-shadow-dark)]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[var(--neu-text-muted)]">Rainfall (today)</span>
        <span className="font-bold">{displayMl} ml</span>
      </div>
      {calOpen && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-[var(--neu-text-muted)]">ml/click:</span>
          <input
            className="neu-inset w-16 px-2 py-1 text-xs rounded-lg text-center"
            value={calInput}
            onChange={e => setCalInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveCal()}
            autoFocus
          />
          <button onClick={saveCal} className="neu-button px-2 py-1 text-xs rounded-lg">Save</button>
          <button onClick={() => setCalOpen(false)} className="neu-button px-2 py-1 text-xs rounded-lg">✕</button>
        </div>
      )}
      <div className="flex justify-between items-center">
        <span className="text-xs text-[var(--neu-text-muted)]">
          {dailyClicks ?? 0} clicks {resetTime && `· reset ${resetTime}`}
        </span>
        <div className="flex gap-1">
          <button
            onClick={openCal}
            className="neu-button px-2 py-1 text-xs rounded-lg"
          >
            Cal
          </button>
          <button
            onClick={handleZero}
            disabled={zeroing}
            className="neu-button px-2 py-1 text-xs rounded-lg disabled:opacity-50"
          >
            {zeroing ? 'Zeroing...' : 'Zero'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WeatherWidget() {
  const { data, loading, error } = useWeather(10000)

  if (loading) {
    return (
      <div className="neu-flat p-6">
        <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">Weather</h2>
        <Skeleton lines={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="neu-flat p-6">
        <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">Weather</h2>
        <div className="neu-inset p-4 text-center">
          <HiOutlineStatusOffline className="w-6 h-6 mx-auto mb-2 text-[var(--neu-text-muted)]" />
          <p className="text-sm text-[var(--neu-text-muted)]">Weather API offline</p>
        </div>
      </div>
    )
  }

  // No data received yet from ESP32
  if (!data || !data.station_id) {
    return (
      <div className="neu-flat p-6">
        <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">Weather</h2>
        <div className="neu-inset p-4 text-center">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse mx-auto mb-2" />
          <p className="text-sm text-[var(--neu-text-muted)]">Waiting for ESP32 data...</p>
          <p className="text-xs text-[var(--neu-text-muted)] mt-1">Station: wx-station-01</p>
        </div>
      </div>
    )
  }

  const ago = data.received_at
    ? getTimeAgo(data.received_at)
    : null

  return (
    <div className="neu-flat p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[var(--neu-accent)]">Weather</h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-[var(--neu-text-muted)]">{data.station_id}</span>
        </div>
      </div>

      <div className="space-y-3">
        <WeatherRow
          label="Temperature"
          value={data.temperature_c != null
            ? `${data.temperature_c}°C / ${((data.temperature_c * 9/5) + 32).toFixed(1)}°F`
            : null}
          unit=""
        />
        <WeatherRow label="Humidity" value={data.humidity_pct} unit="%" />
        <WeatherRow
          label="Pressure"
          value={data.pressure_hpa != null
            ? `${data.pressure_hpa} hPa / ${(data.pressure_hpa * 0.02953).toFixed(2)} inHg`
            : null}
          unit=""
        />
        <WeatherRow
          label="Wind"
          value={data.wind_speed_kmh != null
            ? `${data.wind_speed_kmh} km/h / ${(data.wind_speed_kmh * 0.62137).toFixed(1)} mph`
            : null}
          unit=""
        />
      </div>

      <RainSection
        dailyClicks={data.rain_daily_clicks}
        lastReset={data.rain_last_reset}
      />

      <div className="mt-3 pt-3 border-t border-[var(--neu-shadow-dark)] flex items-center justify-between">
        <BatteryIndicator voltage={data.battery_v} />
        {ago && (
          <span className="text-xs text-[var(--neu-text-muted)]">{ago}</span>
        )}
      </div>
    </div>
  )
}

function getTimeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}
