import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AuthUser, AuthTokens } from '../types/auth'
import * as authApi from '../api/auth'

interface AuthContextValue {
  user: AuthUser | null
  tokens: AuthTokens | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, restore session from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('tokens')
    if (!raw) {
      setIsLoading(false)
      return
    }
    try {
      const stored: AuthTokens = JSON.parse(raw)
      setTokens(stored)
      authApi.getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('tokens')
          setTokens(null)
        })
        .finally(() => setIsLoading(false))
    } catch {
      localStorage.removeItem('tokens')
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const newTokens = await authApi.login(username, password)
    localStorage.setItem('tokens', JSON.stringify(newTokens))
    setTokens(newTokens)
    const me = await authApi.getMe()
    setUser(me)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('tokens')
    queryClient.clear()
    setTokens(null)
    setUser(null)
  }, [queryClient])

  const refreshUser = useCallback(async () => {
    const me = await authApi.getMe()
    setUser(me)
  }, [])

  return (
    <AuthContext.Provider value={{ user, tokens, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
