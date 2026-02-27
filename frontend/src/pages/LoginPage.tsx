import { useState } from 'react'
import { ApiError } from '../api/client'
import './LoginPage.css'

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (email: string, password: string) => Promise<void>
  onAuthenticated: () => void
}

export default function LoginPage({
  onLogin,
  onRegister,
  onAuthenticated,
}: LoginPageProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modeLabel = isRegisterMode ? 'Register' : 'Login'
  const toggleLabel = isRegisterMode
    ? 'Already have an account? Login'
    : 'Need an account? Register'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (isRegisterMode) {
        await onRegister(email, password)
      } else {
        await onLogin(email, password)
      }
      onAuthenticated()
    } catch (requestError) {
      if (requestError instanceof ApiError && typeof requestError.body === 'object') {
        const body = requestError.body as { detail?: string }
        setError(body.detail ?? 'Authentication failed')
      } else {
        setError('Authentication failed')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-panel">
        <h1>{modeLabel}</h1>
        <p>Access challenge chat, payments, and secret validation flows.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email-input">Email</label>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="password-input">Password</label>
          <input
            id="password-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
            minLength={8}
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? `${modeLabel}...` : modeLabel}
          </button>
        </form>

        <button
          className="login-toggle"
          onClick={() => {
            setIsRegisterMode((previousValue) => !previousValue)
            setError(null)
          }}
        >
          {toggleLabel}
        </button>
      </div>
    </section>
  )
}
