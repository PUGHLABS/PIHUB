import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

function parseToken(token) {
  try {
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) return null
    return { username: payload.username, role: payload.role }
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => parseToken(localStorage.getItem('pivault-token')))

  function login(token, userData) {
    localStorage.setItem('pivault-token', token)
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('pivault-token')
    setUser(null)
  }

  // Listen for 401s dispatched by apiFetch
  useEffect(() => {
    window.addEventListener('pivault-logout', logout)
    return () => window.removeEventListener('pivault-logout', logout)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
