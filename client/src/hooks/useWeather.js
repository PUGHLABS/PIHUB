import { useState, useEffect, useCallback } from 'react'

export default function useWeather(intervalMs = 10000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/weather/current')
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
    fetchWeather()
    const id = setInterval(fetchWeather, intervalMs)
    return () => clearInterval(id)
  }, [fetchWeather, intervalMs])

  return { data, loading, error }
}
