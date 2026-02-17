import { Router } from 'express'
import os from 'os'

const router = Router()

// GET /api/v1/system/health
router.get('/health', (req, res) => {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  res.json({
    cpu: {
      temperature: null,
      usage: os.loadavg()[0],
      cores: os.cpus().length,
    },
    memory: {
      total: totalMem,
      used: usedMem,
      percent: Math.round((usedMem / totalMem) * 100),
    },
    disk: {
      total: null,
      used: null,
      percent: null,
    },
    uptime: os.uptime(),
    platform: os.platform(),
    hostname: os.hostname(),
  })
})

export default router
