import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ApiError } from './api/client'
import NavBar from './components/NavBar'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import ChallengeChatPage from './pages/ChallengeChatPage'
import ChallengeListPage from './pages/ChallengeListPage'
import LoginPage from './pages/LoginPage'

function useLocationPath() {
  const [locationPath, setLocationPath] = useState(
    `${window.location.pathname}${window.location.search}`,
  )

  useEffect(() => {
    const listener = () => {
      setLocationPath(`${window.location.pathname}${window.location.search}`)
    }

    window.addEventListener('popstate', listener)
    return () => {
      window.removeEventListener('popstate', listener)
    }
  }, [])

  const navigate = (nextPath: string) => {
    if (nextPath === locationPath) {
      return
    }
    window.history.pushState({}, '', nextPath)
    setLocationPath(`${window.location.pathname}${window.location.search}`)
  }

  return {
    locationPath,
    pathname: window.location.pathname,
    navigate,
  }
}

function readChallengeId(pathname: string): number | null {
  const match = pathname.match(/^\/challenges\/(\d+)$/)
  if (!match) {
    return null
  }

  const parsed = Number(match[1])
  if (Number.isNaN(parsed)) {
    return null
  }
  return parsed
}

function App() {
  const {
    createCreditPurchase,
    creditBalance,
    currentUser,
    isAuthenticated,
    isInitializing,
    login,
    logout,
    refreshCreditBalance,
    register,
  } = useAuth()
  const { navigate, pathname } = useLocationPath()
  const [isPurchasingCredits, setIsPurchasingCredits] = useState(false)
  const [topUpError, setTopUpError] = useState<string | null>(null)

  useEffect(() => {
    if (isInitializing) {
      return
    }

    if (pathname === '/') {
      navigate(isAuthenticated ? '/challenges' : '/login')
      return
    }

    if (isAuthenticated && pathname === '/login') {
      navigate('/challenges')
    }
  }, [isAuthenticated, isInitializing, navigate, pathname])

  const challengeId = useMemo(() => readChallengeId(pathname), [pathname])

  const protectedContent = useMemo(() => {
    if (pathname === '/challenges') {
      return (
        <ChallengeListPage
          onNavigate={navigate}
          onRefreshCredits={refreshCreditBalance}
        />
      )
    }

    if (challengeId) {
      return <ChallengeChatPage challengeId={challengeId} onNavigate={navigate} />
    }

    return <section className="app-empty">Page not found.</section>
  }, [challengeId, navigate, pathname, refreshCreditBalance])

  if (isInitializing) {
    return <section className="app-loading">Loading...</section>
  }

  const loginPage = (
    <LoginPage
      onLogin={login}
      onRegister={register}
      onAuthenticated={() => navigate('/challenges')}
    />
  )

  async function handleTopUpCredits() {
    setIsPurchasingCredits(true)
    setTopUpError(null)
    try {
      const purchase = await createCreditPurchase(1000)
      window.location.assign(purchase.checkout_url)
    } catch (error) {
      if (error instanceof ApiError && typeof error.body === 'object' && error.body) {
        const body = error.body as { detail?: string }
        setTopUpError(body.detail ?? 'Unable to create credit purchase')
      } else {
        setTopUpError('Unable to create credit purchase')
      }
      setIsPurchasingCredits(false)
    }
  }

  return (
    <div className="app-shell">
      <NavBar
        currentPath={pathname}
        isAuthenticated={isAuthenticated}
        email={currentUser?.email ?? null}
        balanceCredits={creditBalance}
        isPurchasingCredits={isPurchasingCredits}
        onNavigate={navigate}
        onTopUpCredits={() => void handleTopUpCredits()}
        onLogout={() => {
          logout()
          navigate('/login')
        }}
      />
      <main className="app-main">
        {topUpError && <p className="app-error-banner">{topUpError}</p>}
        {pathname === '/login' ? (
          loginPage
        ) : (
          <ProtectedRoute isAuthenticated={isAuthenticated} fallback={loginPage}>
            {protectedContent}
          </ProtectedRoute>
        )}
      </main>
    </div>
  )
}

export default App
