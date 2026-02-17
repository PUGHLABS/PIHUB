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
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `API error: ${res.status}`)
  }

  return res.json()
}
