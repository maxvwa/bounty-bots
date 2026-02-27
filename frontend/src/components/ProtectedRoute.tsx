import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  isAuthenticated: boolean
  children: ReactNode
  fallback: ReactNode
}

export default function ProtectedRoute({
  isAuthenticated,
  children,
  fallback,
}: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
