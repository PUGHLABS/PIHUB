import { useState } from 'react'
import WeatherWidget from '../components/widgets/WeatherWidget'
import WeatherChartPanel from '../components/widgets/WeatherChartPanel'
import WeatherStatsPanel from '../components/widgets/WeatherStatsPanel'

function ExportButtons() {
  const [exporting, setExporting] = useState(null)
  const [range, setRange] = useState('24h')

  async function handleExport(format) {
    setExporting(format)
    try {
      const url = `/api/v1/weather/export?station=wx-station-01&range=${range}&format=${format}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match ? match[1] : `weather-${range}.${format}`
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="neu-flat p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-[var(--neu-accent)]">Export Data</h2>
          <p className="text-xs text-[var(--neu-text-muted)] mt-1">
            Download weather history as CSV or JSON
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={range}
            onChange={e => setRange(e.target.value)}
            className="neu-inset px-3 py-1.5 text-xs rounded-lg bg-transparent text-[var(--neu-text)] border-none outline-none cursor-pointer"
          >
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting != null}
            className="neu-button px-4 py-1.5 text-xs rounded-lg font-medium disabled:opacity-50"
          >
            {exporting === 'csv' ? 'Downloading…' : '⬇ CSV'}
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting != null}
            className="neu-button px-4 py-1.5 text-xs rounded-lg font-medium disabled:opacity-50"
          >
            {exporting === 'json' ? 'Downloading…' : '⬇ JSON'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WeatherPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--neu-text)] lg:hidden">Weather</h1>

      {/* Current conditions */}
      <WeatherWidget />

      {/* Trend charts */}
      <WeatherChartPanel />

      {/* Min/max/avg summary */}
      <WeatherStatsPanel />

      {/* Export */}
      <ExportButtons />
    </div>
  )
}
