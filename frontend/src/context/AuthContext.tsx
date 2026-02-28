/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ApiError,
  apiFetch,
  clearAuthToken,
  loadAuthToken,
  saveAuthToken,
} from '@/api/client'
import type { AuthTokenResponse, UserMe } from '@/types/api'

interface AuthContextValue {
  token: string | null
  currentUser: UserMe | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const SKIP_AUTH = (import.meta.env.VITE_SKIP_AUTH ?? "true") === "true"
const DEMO_TOKEN = "__demo__"

async function fetchCurrentUser(token: string): Promise<UserMe> {
  return apiFetch<UserMe>('/auth/me', {
    authToken: token,
    skipAuthRedirect: true,
  })
}

function useAuthState() {
  const [token, setToken] = useState<string | null>(() =>
    SKIP_AUTH ? DEMO_TOKEN : loadAuthToken(),
  )
  const [currentUser, setCurrentUser] = useState<UserMe | null>(null)
  const [isInitializing, setIsInitializing] = useState<boolean>(true)

  const logout = useCallback(() => {
    if (SKIP_AUTH) {
      return
    }
    clearAuthToken()
    setToken(null)
    setCurrentUser(null)
  }, [])

  const applyToken = useCallback(
    async (nextToken: string) => {
      if (SKIP_AUTH) {
        setToken(DEMO_TOKEN)
        const me = await fetchCurrentUser(DEMO_TOKEN)
        setCurrentUser(me)
        return
      }
      saveAuthToken(nextToken)
      setToken(nextToken)
      try {
        const me = await fetchCurrentUser(nextToken)
        setCurrentUser(me)
      } catch {
        logout()
        throw new Error('Unable to load authenticated user')
      }
    },
    [logout],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      if (SKIP_AUTH) {
        await applyToken(DEMO_TOKEN)
        return
      }
      const response = await apiFetch<AuthTokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuthRedirect: true,
      })
      await applyToken(response.access_token)
    },
    [applyToken],
  )

  const register = useCallback(
    async (email: string, password: string) => {
      if (SKIP_AUTH) {
        await applyToken(DEMO_TOKEN)
        return
      }
      const response = await apiFetch<AuthTokenResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuthRedirect: true,
      })
      await applyToken(response.access_token)
    },
    [applyToken],
  )

  useEffect(() => {
    const bootstrap = async () => {
      if (SKIP_AUTH) {
        try {
          const me = await fetchCurrentUser(DEMO_TOKEN)
          setToken(DEMO_TOKEN)
          setCurrentUser(me)
        } finally {
          setIsInitializing(false)
        }
        return
      }

      const existingToken = loadAuthToken()
      if (!existingToken) {
        setIsInitializing(false)
        return
      }

      try {
        const me = await fetchCurrentUser(existingToken)
        setToken(existingToken)
        setCurrentUser(me)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearAuthToken()
        }
        setToken(null)
        setCurrentUser(null)
      } finally {
        setIsInitializing(false)
      }
    }

    void bootstrap()
  }, [])

  return {
    token,
    currentUser,
    isAuthenticated: Boolean(token),
    isInitializing,
    login,
    register,
    logout,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthState()
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return useMemo(() => context, [context])
}
