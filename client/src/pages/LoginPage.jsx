import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NeuCard from '../components/ui/NeuCard'
import NeuButton from '../components/ui/NeuButton'
import NeuInput from '../components/ui/NeuInput'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Login failed')
      login(data.token, data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'var(--neu-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--neu-text)]">PiVault</h1>
          <p className="text-[var(--neu-text-muted)] mt-1 text-sm">Secure NAS Dashboard</p>
        </div>

        <NeuCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[var(--neu-text-muted)] block mb-1">Username</label>
              <NeuInput
                placeholder="admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="text-xs text-[var(--neu-text-muted)] block mb-1">Password</label>
              <NeuInput
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <NeuButton type="submit" disabled={loading} className="w-full justify-center mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </NeuButton>
          </form>
        </NeuCard>
      </div>
    </div>
  )
}
