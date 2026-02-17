import useSystemHealth from '../../hooks/useSystemHealth'
import Skeleton from '../ui/Skeleton'

function formatBytes(bytes) {
  if (bytes == null) return '—'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

function ProgressRing({ percent, size = 80, stroke = 6, color = 'var(--neu-accent)' }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--neu-shadow-dark)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

function HealthGauge({ label, value, unit, percent, color }) {
  return (
    <div className="neu-inset p-4 flex flex-col items-center gap-2">
      <div className="relative">
        <ProgressRing percent={percent ?? 0} color={color} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{percent != null ? `${percent}%` : '—'}</span>
        </div>
      </div>
      <p className="text-xs text-[var(--neu-text-muted)] uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium">{value}{unit && <span className="text-[var(--neu-text-muted)]"> {unit}</span>}</p>
    </div>
  )
}

export default function SystemHealthPanel() {
  const { data, loading, error } = useSystemHealth(5000)

  if (loading) {
    return (
      <div className="neu-flat p-6">
        <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">System Health</h2>
        <Skeleton lines={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="neu-flat p-6">
        <h2 className="font-semibold mb-4 text-[var(--neu-accent)]">System Health</h2>
        <div className="neu-inset p-4 text-center">
          <p className="text-sm text-[var(--neu-text-muted)]">Server offline</p>
          <p className="text-xs text-[var(--neu-text-muted)] mt-1">Start the backend: cd server && npm run dev</p>
        </div>
      </div>
    )
  }

  const { cpu, memory, disk, uptime, hostname, platform } = data
  const tempColor = cpu.temperature > 70 ? '#ef4444' : cpu.temperature > 55 ? '#f59e0b' : 'var(--neu-accent)'
  const memColor = memory.percent > 85 ? '#ef4444' : memory.percent > 70 ? '#f59e0b' : 'var(--neu-accent)'
  const diskColor = disk.percent > 90 ? '#ef4444' : disk.percent > 75 ? '#f59e0b' : 'var(--neu-accent)'

  return (
    <div className="neu-flat p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[var(--neu-accent)]">System Health</h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-[var(--neu-text-muted)]">{hostname}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HealthGauge
          label="CPU"
          value={cpu.temperature != null ? `${cpu.temperature.toFixed(1)}°C` : `${cpu.usage}%`}
          unit={cpu.temperature != null ? '' : 'usage'}
          percent={cpu.usage}
          color={cpu.temperature != null ? tempColor : 'var(--neu-accent)'}
        />
        <HealthGauge
          label="Memory"
          value={`${formatBytes(memory.used)} / ${formatBytes(memory.total)}`}
          percent={memory.percent}
          color={memColor}
        />
        <HealthGauge
          label="Disk"
          value={disk.total ? `${formatBytes(disk.used)} / ${formatBytes(disk.total)}` : '—'}
          percent={disk.percent}
          color={diskColor}
        />
        <div className="neu-inset p-4 flex flex-col items-center justify-center gap-2">
          <div className="text-2xl font-bold text-[var(--neu-accent)]">
            {uptime.formatted}
          </div>
          <p className="text-xs text-[var(--neu-text-muted)] uppercase tracking-wide">Uptime</p>
          <p className="text-xs text-[var(--neu-text-muted)]">
            {platform === 'linux' ? 'Raspberry Pi' : platform}
          </p>
        </div>
      </div>
    </div>
  )
}
