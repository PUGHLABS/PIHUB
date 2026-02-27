import { useState, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import useWeatherHistory from '../../hooks/useWeatherHistory'
import Skeleton from '../ui/Skeleton'

const RANGES = [
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
]

const METRICS = [
  {
    key: 'temperature_c',
    label: 'Temperature',
    unit: '°C',
    color: '#f59e0b',
    format: v => v != null ? `${v.toFixed(1)}°C` : '—',
    chartType: 'line',
  },
  {
    key: 'humidity_pct',
    label: 'Humidity',
    unit: '%',
    color: '#3b82f6',
    format: v => v != null ? `${v.toFixed(1)}%` : '—',
    chartType: 'line',
  },
  {
    key: 'pressure_hpa',
    label: 'Pressure',
    unit: 'hPa',
    color: '#8b5cf6',
    format: v => v != null ? `${v.toFixed(1)} hPa` : '—',
    chartType: 'line',
  },
  {
    key: 'wind_speed_kmh',
    label: 'Wind',
    unit: 'km/h',
    color: '#10b981',
    format: v => v != null ? `${v.toFixed(1)} km/h` : '—',
    chartType: 'line',
  },
  {
    key: 'rain_ml',
    label: 'Rain',
    unit: ' ml',
    color: '#06b6d4',
    format: v => v != null ? `${v.toFixed(2)} ml` : '—',
    chartType: 'bar',
  },
]

function formatTick(isoString, range) {
  const d = new Date(isoString)
  if (range === '7d') {
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function CustomTooltip({ active, payload, label, metric, range }) {
  if (!active || !payload?.length) return null
  const d = new Date(label)
  const timeStr = range === '7d'
    ? d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="neu-flat px-3 py-2 text-sm rounded-xl" style={{ minWidth: '140px' }}>
      <p className="text-[var(--neu-text-muted)] text-xs mb-1">{timeStr}</p>
      <p className="font-bold" style={{ color: metric.color }}>
        {metric.format(payload[0]?.value)}
      </p>
    </div>
  )
}

// Compute per-interval rain deltas from cumulative daily clicks
function computeRainData(data) {
  const mlPerClick = parseFloat(localStorage.getItem('rain_ml_per_click') || '4.25')
  return data.map((d, i) => {
    if (i === 0) return { ...d, rain_ml: 0 }
    const prev = data[i - 1]
    const delta = Math.max(0, (d.rain_daily_clicks ?? 0) - (prev.rain_daily_clicks ?? 0))
    return { ...d, rain_ml: Math.round(delta * mlPerClick * 100) / 100 }
  })
}

export default function WeatherChartPanel() {
  const [range, setRange] = useState('24h')
  const [metricKey, setMetricKey] = useState('temperature_c')
  const { data: rawData, loading, error } = useWeatherHistory(range)

  const metric = METRICS.find(m => m.key === metricKey)

  const chartData = useMemo(() => {
    if (metricKey === 'rain_ml') {
      const withRain = computeRainData(rawData)
      // For rain, show all points (even 0s tell the story)
      return withRain
    }
    return rawData.filter(d => d[metricKey] != null)
  }, [rawData, metricKey])

  const hasRain = metricKey === 'rain_ml' && chartData.some(d => d.rain_ml > 0)

  return (
    <div className="neu-flat p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-semibold text-[var(--neu-accent)]">Trend Charts</h2>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                range === r.value ? 'neu-inset text-[var(--neu-accent)]' : 'neu-button'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setMetricKey(m.key)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              metricKey === m.key ? 'neu-inset' : 'neu-button'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      {loading ? (
        <div className="h-48"><Skeleton lines={3} /></div>
      ) : error ? (
        <div className="h-48 neu-inset rounded-xl flex items-center justify-center">
          <p className="text-sm text-[var(--neu-text-muted)]">Chart data unavailable</p>
        </div>
      ) : chartData.length === 0 || (metricKey === 'rain_ml' && !hasRain && chartData.length < 2) ? (
        <div className="h-48 neu-inset rounded-xl flex items-center justify-center">
          <p className="text-sm text-[var(--neu-text-muted)]">
            {metricKey === 'rain_ml' ? 'No rain recorded in this period' : 'No data for this period yet'}
          </p>
        </div>
      ) : (
        <div className="neu-inset rounded-xl p-3">
          <ResponsiveContainer width="100%" height={220}>
            {metric.chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--neu-shadow-dark)" opacity={0.5} />
                <XAxis
                  dataKey="time"
                  tickFormatter={tick => formatTick(tick, range)}
                  tick={{ fontSize: 10, fill: 'var(--neu-text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--neu-text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                  tickFormatter={v => `${v}ml`}
                />
                <Tooltip content={props => <CustomTooltip {...props} metric={metric} range={range} />} />
                <Bar dataKey="rain_ml" isAnimationActive={false} radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.rain_ml > 0 ? metric.color : 'var(--neu-shadow-dark)'}
                      opacity={entry.rain_ml > 0 ? 0.85 : 0.2}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--neu-shadow-dark)" opacity={0.5} />
                <XAxis
                  dataKey="time"
                  tickFormatter={tick => formatTick(tick, range)}
                  tick={{ fontSize: 10, fill: 'var(--neu-text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--neu-text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                  tickFormatter={v => `${v}${metric.unit}`}
                />
                <Tooltip content={props => <CustomTooltip {...props} metric={metric} range={range} />} />
                <Line
                  type="monotone"
                  dataKey={metricKey}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: metric.color }}
                  isAnimationActive={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-xs text-[var(--neu-text-muted)] mt-2 text-right">
        {chartData.length} points · refreshes every 60s
      </p>
    </div>
  )
}
