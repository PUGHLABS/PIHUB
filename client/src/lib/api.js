const BASE_URL = '/api/v1'

export async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const token = localStorage.getItem('pivault-token')

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('pivault-token')
      window.dispatchEvent(new Event('pivault-logout'))
    }
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `API error: ${res.status}`)
  }

  return res.json()
}

// For endpoints hit directly by <img>/<video>/<a> tags, which can't send an
// Authorization header — appends the token as a query param instead.
export function authedUrl(endpoint, params = {}) {
  const token = localStorage.getItem('pivault-token')
  const query = new URLSearchParams({ ...params, ...(token && { token }) })
  return `${BASE_URL}${endpoint}?${query.toString()}`
}

export async function uploadFiles(endpoint, files) {
  const token = localStorage.getItem('pivault-token')
  const formData = new FormData()
  for (const file of files) formData.append('files', file)

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: formData,
  })

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('pivault-token')
      window.dispatchEvent(new Event('pivault-logout'))
    }
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `API error: ${res.status}`)
  }

  return res.json()
}
