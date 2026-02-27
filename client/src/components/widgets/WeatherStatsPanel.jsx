import { useState, useMemo } from 'react'
import useWeatherHistory from '../../hooks/useWeatherHistory'
import Skeleton from '../ui/Skeleton'

const RANGES = [
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
]

function calcStats(data, key) {
  const vals = data.map(d => d[key]).filter(v => v != null)
  if (vals.length === 0) return { min: null, max: null, avg: null }
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length
  return { min, max, avg }
}

function r(v, d = 1) {
  return v != null ? Math.round(v * 10 ** d) / 10 ** d : null
}

function StatCard({ label, icon, min, max, avg, unit, color = 'var(--neu-accent)' }) {
  return (
    <div className="neu-inset p-4 rounded-xl flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-[var(--neu-text-muted)] uppercase tracking-wide font-medium">
          {label}
        </span>
      </div>

      {avg != null ? (
        <>
          <div className="text-center">
            <span className="text-2xl font-bold" style={{ color }}>
              {avg}{unit}
            </span>
            <p className="text-xs text-[var(--neu-text-muted)] mt-0.5">avg</p>
          </div>
          <div className="flex justify-between text-xs">
            <div className="text-center">
              <p className="text-[var(--neu-text-muted)]">Min</p>
              <p className="font-semibold">{min ?? '—'}{min != null ? unit : ''}</p>
            </div>
            <div className="w-px bg-[var(--neu-shadow-dark)]" />
            <div className="text-center">
              <p className="text-[var(--neu-text-muted)]">Max</p>
              <p className="font-semibold">{max ?? '—'}{max != null ? unit : ''}</p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--neu-text-muted)] text-center">No data</p>
      )}
    </div>
  )
}

export default function WeatherStatsPanel() {
  const [range, setRange] = useState('24h')
  const { data: history, loading, error } = useWeatherHistory(range)

  const stats = useMemo(() => {
    if (!history.length) return null
    const temp = calcStats(history, 'temperature_c')
    const hum  = calcStats(history, 'humidity_pct')
    const pres = calcStats(history, 'pressure_hpa')
    const wind = calcStats(history, 'wind_speed_kmh')
    return { temp, hum, pres, wind }
  }, [history])

  return (
    <div className="neu-flat p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-semibold text-[var(--neu-accent)]">Summary Stats</h2>
        <div className="flex gap-1">
          {RANGES.map(rv => (
            <button
              key={rv.value}
              onClick={() => setRange(rv.value)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                range === rv.value
                  ? 'neu-inset text-[var(--neu-accent)]'
                  : 'neu-button'
              }`}
            >
              {rv.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton lines={4} />
      ) : error || !stats ? (
        <div className="neu-inset p-4 rounded-xl text-center">
          <p className="text-sm text-[var(--neu-text-muted)]">No data for this period yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Temperature"
            icon="🌡️"
            min={r(stats.temp.min)}
            max={r(stats.temp.max)}
            avg={r(stats.temp.avg)}
            unit="°C"
            color="#f59e0b"
          />
          <StatCard
            label="Humidity"
            icon="💧"
            min={r(stats.hum.min)}
            max={r(stats.hum.max)}
            avg={r(stats.hum.avg)}
            unit="%"
            color="#3b82f6"
          />
          <StatCard
            label="Pressure"
            icon="🔵"
            min={r(stats.pres.min, 2)}
            max={r(stats.pres.max, 2)}
            avg={r(stats.pres.avg, 2)}
            unit=" hPa"
            color="#8b5cf6"
          />
          <StatCard
            label="Wind"
            icon="💨"
            min={r(stats.wind.min)}
            max={r(stats.wind.max)}
            avg={r(stats.wind.avg)}
            unit=" km/h"
            color="#10b981"
          />
        </div>
      )}

      {stats && (
        <p className="text-xs text-[var(--neu-text-muted)] mt-3 text-right">
          Based on {history.length} readings
        </p>
      )}
    </div>
  )
}
