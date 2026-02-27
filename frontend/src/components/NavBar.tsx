import './NavBar.css'

interface NavBarProps {
  currentPath: string
  isAuthenticated: boolean
  email: string | null
  onNavigate: (path: string) => void
  onLogout: () => void
}

function isPathActive(currentPath: string, routePath: string): boolean {
  if (routePath === '/challenges') {
    return currentPath.startsWith('/challenges')
  }
  return currentPath === routePath
}

export default function NavBar({
  currentPath,
  isAuthenticated,
  email,
  onNavigate,
  onLogout,
}: NavBarProps) {
  return (
    <header className="nav-shell">
      <button className="nav-title" onClick={() => onNavigate('/challenges')}>
        Bounty Bots
      </button>

      <nav className="nav-links">
        {isAuthenticated && (
          <button
            className={isPathActive(currentPath, '/challenges') ? 'nav-link active' : 'nav-link'}
            onClick={() => onNavigate('/challenges')}
          >
            Challenges
          </button>
        )}
      </nav>

      <div className="nav-user">
        {isAuthenticated ? (
          <>
            <span className="nav-email">{email ?? 'Authenticated user'}</span>
            <button className="nav-logout" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <button className="nav-login" onClick={() => onNavigate('/login')}>
            Login
          </button>
        )}
      </div>
    </header>
  )
}
