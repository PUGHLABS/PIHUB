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

function toF(c)    { return c    != null ? r(c * 9 / 5 + 32, 1) : null }
function toInHg(h) { return h    != null ? r(h * 0.02953,    2) : null }
function toMph(k)  { return k    != null ? r(k * 0.621371,   1) : null }

function UnitToggle({ options, value, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden neu-inset">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-2 py-0.5 text-xs font-medium transition-all ${
            value === opt
              ? 'text-[var(--neu-accent)] font-bold'
              : 'text-[var(--neu-text-muted)]'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
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
  const [range, setRange]       = useState('24h')
  const [tempUnit, setTempUnit]   = useState('°F')
  const [pressUnit, setPressUnit] = useState('inHg')
  const [windUnit, setWindUnit]   = useState('mph')

  const { data: history, loading, error } = useWeatherHistory(range)

  const stats = useMemo(() => {
    if (!history.length) return null
    return {
      temp: calcStats(history, 'temperature_c'),
      hum:  calcStats(history, 'humidity_pct'),
      pres: calcStats(history, 'pressure_hpa'),
      wind: calcStats(history, 'wind_speed_kmh'),
    }
  }, [history])

  // Convert values based on selected units
  const tempConv  = v => tempUnit  === '°F'   ? toF(v)    : r(v, 1)
  const pressConv = v => pressUnit === 'inHg'  ? toInHg(v) : r(v, 2)
  const windConv  = v => windUnit  === 'mph'   ? toMph(v)  : r(v, 1)

  const pressUnitLabel = pressUnit === 'inHg' ? '"' : ' hPa'
  const windUnitLabel  = windUnit  === 'mph'  ? ' mph' : ' km/h'

  return (
    <div className="neu-flat p-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
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

      {/* Unit toggles */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <UnitToggle options={['°C', '°F']}     value={tempUnit}  onChange={setTempUnit}  />
        <UnitToggle options={['hPa', 'inHg']}  value={pressUnit} onChange={setPressUnit} />
        <UnitToggle options={['kph', 'mph']}   value={windUnit}  onChange={setWindUnit}  />
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
            min={tempConv(stats.temp.min)}
            max={tempConv(stats.temp.max)}
            avg={tempConv(stats.temp.avg)}
            unit={tempUnit}
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
            min={pressConv(stats.pres.min)}
            max={pressConv(stats.pres.max)}
            avg={pressConv(stats.pres.avg)}
            unit={pressUnitLabel}
            color="#8b5cf6"
          />
          <StatCard
            label="Wind"
            icon="💨"
            min={windConv(stats.wind.min)}
            max={windConv(stats.wind.max)}
            avg={windConv(stats.wind.avg)}
            unit={windUnitLabel}
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
