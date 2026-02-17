import { useState, useEffect, useCallback } from 'react'

export default function useSystemHealth(intervalMs = 5000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/system/health')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    const id = setInterval(fetchHealth, intervalMs)
    return () => clearInterval(id)
  }, [fetchHealth, intervalMs])

  return { data, loading, error }
}
