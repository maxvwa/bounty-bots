import { useEffect, useMemo, useState } from 'react'
import './App.css'
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
  const { currentUser, isAuthenticated, isInitializing, login, logout, register } = useAuth()
  const { navigate, pathname } = useLocationPath()

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
      return <ChallengeListPage onNavigate={navigate} />
    }

    if (challengeId) {
      return <ChallengeChatPage challengeId={challengeId} onNavigate={navigate} />
    }

    return <section className="app-empty">Page not found.</section>
  }, [challengeId, navigate, pathname])

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

  return (
    <div className="app-shell">
      <NavBar
        currentPath={pathname}
        isAuthenticated={isAuthenticated}
        email={currentUser?.email ?? null}
        onNavigate={navigate}
        onLogout={() => {
          logout()
          navigate('/login')
        }}
      />
      <main className="app-main">
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
