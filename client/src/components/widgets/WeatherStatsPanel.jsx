import { useState } from 'react'
import useWeatherStats from '../../hooks/useWeatherStats'
import Skeleton from '../ui/Skeleton'

const RANGES = [
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
]

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
  const { data, loading, error } = useWeatherStats(range)

  return (
    <div className="neu-flat p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-semibold text-[var(--neu-accent)]">Summary Stats</h2>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                range === r.value
                  ? 'neu-inset text-[var(--neu-accent)]'
                  : 'neu-button'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton lines={4} />
      ) : error ? (
        <div className="neu-inset p-4 rounded-xl text-center">
          <p className="text-sm text-[var(--neu-text-muted)]">Stats unavailable</p>
        </div>
      ) : !data || data.samples === 0 ? (
        <div className="neu-inset p-4 rounded-xl text-center">
          <p className="text-sm text-[var(--neu-text-muted)]">No data for this period yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Temperature"
            icon="🌡️"
            min={data.temperature_c.min}
            max={data.temperature_c.max}
            avg={data.temperature_c.avg}
            unit="°C"
            color="#f59e0b"
          />
          <StatCard
            label="Humidity"
            icon="💧"
            min={data.humidity_pct.min}
            max={data.humidity_pct.max}
            avg={data.humidity_pct.avg}
            unit="%"
            color="#3b82f6"
          />
          <StatCard
            label="Pressure"
            icon="🔵"
            min={data.pressure_hpa.min}
            max={data.pressure_hpa.max}
            avg={data.pressure_hpa.avg}
            unit=" hPa"
            color="#8b5cf6"
          />
          <StatCard
            label="Wind"
            icon="💨"
            min={data.wind_speed_kmh.min}
            max={data.wind_speed_kmh.max}
            avg={data.wind_speed_kmh.avg}
            unit=" km/h"
            color="#10b981"
          />
        </div>
      )}

      {data && data.samples > 0 && (
        <p className="text-xs text-[var(--neu-text-muted)] mt-3 text-right">
          Based on {data.samples} readings
        </p>
      )}
    </div>
  )
}
