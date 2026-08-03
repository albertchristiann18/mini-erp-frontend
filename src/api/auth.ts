import { http } from '../lib/http'
import type { AuthUser, AuthTokens } from '../types/auth'

export const login = (username: string, password: string): Promise<AuthTokens> =>
  http.post<AuthTokens>('/api/token/', { username, password })

export const refreshToken = (refresh: string): Promise<AuthTokens> =>
  http.post<AuthTokens>('/api/token/refresh/', { refresh })

export const getMe = (): Promise<AuthUser> =>
  http.get<AuthUser>('/api/profile/')

export interface UpdateProfilePayload {
  username?: string
  email?: string
  current_password?: string
  new_password?: string
}

export const updateProfile = (payload: UpdateProfilePayload): Promise<AuthUser> =>
  http.patch<AuthUser>('/api/profile/', payload)
