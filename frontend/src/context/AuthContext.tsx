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
} from '../api/client'
import type {
  AuthTokenResponse,
  CreditBalanceResponse,
  CreditPurchaseCreateResponse,
  UserMe,
} from '../types'

interface AuthContextValue {
  token: string | null
  currentUser: UserMe | null
  creditBalance: number
  isAuthenticated: boolean
  isInitializing: boolean
  isBalanceLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  refreshCreditBalance: () => Promise<void>
  createCreditPurchase: (amountCents: number) => Promise<CreditPurchaseCreateResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchCurrentUser(token: string): Promise<UserMe> {
  return apiFetch<UserMe>('/auth/me', {
    authToken: token,
    skipAuthRedirect: true,
  })
}

async function fetchCreditBalance(token: string): Promise<number> {
  const payload = await apiFetch<CreditBalanceResponse>('/credits/balance', {
    authToken: token,
    skipAuthRedirect: true,
  })
  return payload.balance_credits
}

function useAuthState() {
  const [token, setToken] = useState<string | null>(() => loadAuthToken())
  const [currentUser, setCurrentUser] = useState<UserMe | null>(null)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [isInitializing, setIsInitializing] = useState<boolean>(true)
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false)

  const logout = useCallback(() => {
    clearAuthToken()
    setToken(null)
    setCurrentUser(null)
    setCreditBalance(0)
  }, [])

  const refreshCreditBalance = useCallback(async () => {
    if (!token) {
      setCreditBalance(0)
      return
    }

    setIsBalanceLoading(true)
    try {
      const balance = await fetchCreditBalance(token)
      setCreditBalance(balance)
    } finally {
      setIsBalanceLoading(false)
    }
  }, [token])

  const applyToken = useCallback(
    async (nextToken: string) => {
      saveAuthToken(nextToken)
      setToken(nextToken)
      try {
        const [me, balance] = await Promise.all([
          fetchCurrentUser(nextToken),
          fetchCreditBalance(nextToken),
        ])
        setCurrentUser(me)
        setCreditBalance(balance)
      } catch {
        logout()
        throw new Error('Unable to load authenticated user')
      }
    },
    [logout],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiFetch<AuthTokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuthRedirect: true,
      })
      await applyToken(response.access_token)
    },
    [applyToken],
  )

  const createCreditPurchase = useCallback(
    async (amountCents: number) => {
      if (!token) {
        throw new Error('Not authenticated')
      }

      return apiFetch<CreditPurchaseCreateResponse>('/credits/purchases', {
        method: 'POST',
        authToken: token,
        body: JSON.stringify({ amount_cents: amountCents }),
      })
    },
    [token],
  )

  const register = useCallback(
    async (email: string, password: string) => {
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
      const existingToken = loadAuthToken()
      if (!existingToken) {
        setIsInitializing(false)
        return
      }

      try {
        const [me, balance] = await Promise.all([
          fetchCurrentUser(existingToken),
          fetchCreditBalance(existingToken),
        ])
        setToken(existingToken)
        setCurrentUser(me)
        setCreditBalance(balance)
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
    creditBalance,
    isAuthenticated: Boolean(token),
    isInitializing,
    isBalanceLoading,
    login,
    register,
    refreshCreditBalance,
    createCreditPurchase,
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
