import { useState, useEffect, useCallback } from 'react'

export default function useWeatherStats(range = '24h', station = 'wx-station-01') {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/weather/stats?station=${station}&range=${range}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [range, station])

  useEffect(() => {
    fetch_()
    const id = setInterval(fetch_, 60000)
    return () => clearInterval(id)
  }, [fetch_])

  return { data, loading, error, refetch: fetch_ }
}
