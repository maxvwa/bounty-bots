import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modeLabel = isRegisterMode ? 'Register' : 'Login'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (isRegisterMode) {
        await register(email, password)
      } else {
        await login(email, password)
      }
      navigate('/', { replace: true })
    } catch (requestError) {
      if (requestError instanceof ApiError && typeof requestError.body === 'object') {
        const body = requestError.body as { detail?: string }
        setError(body.detail ?? 'Authentication failed')
      } else if (requestError instanceof Error) {
        setError(
          `Authentication failed (${requestError.message}). Check backend availability and CORS settings.`,
        )
      } else {
        setError('Authentication failed')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 neon-border">
        <h1 className="font-mono text-3xl font-bold text-primary neon-text mb-2">
          BOUNTY BOTS
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {modeLabel} to launch attacks, buy credits, and claim bounties.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-mono text-muted-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-mono text-muted-foreground mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              minLength={8}
              required
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-4 py-2 font-mono font-semibold text-primary-foreground hover:bg-primary/80 disabled:opacity-60"
          >
            {isSubmitting ? `${modeLabel}...` : modeLabel}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 text-sm font-mono text-muted-foreground hover:text-foreground"
          onClick={() => {
            setIsRegisterMode((previousValue) => !previousValue)
            setError(null)
          }}
        >
          {isRegisterMode ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </div>
    </div>
  )
}
