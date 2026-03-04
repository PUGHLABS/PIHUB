import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api.js'

export default function useCameraRecordings(cameraId, date) {
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRecordings = useCallback(async () => {
    if (!cameraId) return
    setLoading(true)
    try {
      const params = date ? `?date=${date}` : ''
      const data = await apiFetch(`/cameras/${cameraId}/recordings${params}`)
      setRecordings(data.recordings)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [cameraId, date])

  useEffect(() => {
    fetchRecordings()
  }, [fetchRecordings])

  return { recordings, loading, error, refetch: fetchRecordings }
}
