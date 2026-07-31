import { useState, useEffect, useCallback } from 'react'
import { apiFetch, uploadFiles as apiUploadFiles } from '../lib/api.js'

export default function useFileBrowser(apiBase) {
  const [path, setPath] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const query = path ? `?path=${encodeURIComponent(path)}` : ''
      const data = await apiFetch(`${apiBase}${query}`)
      setItems(data.items)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiBase, path])

  useEffect(() => {
    refetch()
  }, [refetch])

  function open(name) {
    setPath(prev => (prev ? `${prev}/${name}` : name))
  }

  // index < 0 goes to root; otherwise truncates the path to that breadcrumb segment
  function goTo(index) {
    const parts = path.split('/').filter(Boolean)
    setPath(index < 0 ? '' : parts.slice(0, index + 1).join('/'))
  }

  async function upload(files) {
    const query = path ? `?path=${encodeURIComponent(path)}` : ''
    await apiUploadFiles(`${apiBase}/upload${query}`, files)
    await refetch()
  }

  async function remove(name) {
    const target = path ? `${path}/${name}` : name
    await apiFetch(`${apiBase}?path=${encodeURIComponent(target)}`, { method: 'DELETE' })
    await refetch()
  }

  async function mkdir(name) {
    await apiFetch(`${apiBase}/mkdir`, {
      method: 'POST',
      body: JSON.stringify({ path, name }),
    })
    await refetch()
  }

  return { path, items, loading, error, open, goTo, upload, remove, mkdir, refetch }
}
