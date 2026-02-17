import { Router } from 'express'
import os from 'os'
import { execSync } from 'child_process'
import { statfsSync } from 'fs'

const router = Router()

function getCpuTemperature() {
  try {
    // Raspberry Pi: read from thermal zone
    if (os.platform() === 'linux') {
      const temp = execSync('cat /sys/class/thermal/thermal_zone0/temp', { encoding: 'utf-8' }).trim()
      return parseFloat(temp) / 1000
    }
  } catch {
    // Not available
  }
  return null
}

function getCpuUsage() {
  const cpus = os.cpus()
  let totalIdle = 0
  let totalTick = 0

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type]
    }
    totalIdle += cpu.times.idle
  }

  return Math.round((1 - totalIdle / totalTick) * 100)
}

function getDiskUsage(path = '/') {
  try {
    if (os.platform() === 'win32') {
      // PowerShell approach for modern Windows
      const output = execSync(
        'powershell -Command "Get-PSDrive C | Select-Object Used,Free | ConvertTo-Json"',
        { encoding: 'utf-8' }
      )
      const info = JSON.parse(output)
      const used = info.Used
      const total = info.Used + info.Free
      return { total, used, percent: Math.round((used / total) * 100) }
    }

    const stats = statfsSync(path)
    const total = stats.blocks * stats.bsize
    const free = stats.bfree * stats.bsize
    const used = total - free
    return { total, used, percent: Math.round((used / total) * 100) }
  } catch {
    return { total: null, used: null, percent: null }
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  return parts.join(' ') || '0m'
}

// GET /api/v1/system/health
router.get('/health', (req, res) => {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const uptimeSeconds = os.uptime()
  const disk = getDiskUsage()

  res.json({
    cpu: {
      temperature: getCpuTemperature(),
      usage: getCpuUsage(),
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown',
    },
    memory: {
      total: totalMem,
      used: usedMem,
      percent: Math.round((usedMem / totalMem) * 100),
    },
    disk,
    uptime: {
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds),
    },
    platform: os.platform(),
    hostname: os.hostname(),
    arch: os.arch(),
    timestamp: new Date().toISOString(),
  })
})

export default router
