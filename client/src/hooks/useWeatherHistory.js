import { useState, useEffect, useCallback } from 'react'

export default function useWeatherHistory(range = '24h', station = 'wx-station-01') {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/weather/history?station=${station}&range=${range}&limit=300`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      // Normalize: new server returns `time`, old server returns `received_at`
      setData((json.data || []).map(d => ({ ...d, time: d.time ?? d.received_at })))
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [range, station])

  useEffect(() => {
    fetch_()
    // Refresh every 60 seconds
    const id = setInterval(fetch_, 60000)
    return () => clearInterval(id)
  }, [fetch_])

  return { data, loading, error, refetch: fetch_ }
}
