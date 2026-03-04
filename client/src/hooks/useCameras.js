import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api.js'

export default function useCameras(intervalMs = 15000) {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    try {
      const data = await apiFetch('/cameras')
      setCameras(data.cameras)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
    const id = setInterval(refetch, intervalMs)
    return () => clearInterval(id)
  }, [refetch, intervalMs])

  return { cameras, loading, error, refetch }
}
