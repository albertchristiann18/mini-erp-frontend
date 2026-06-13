import client from './client'
import type { AuthUser, AuthTokens } from '../types/auth'

export const login = (username: string, password: string) =>
  client.post<AuthTokens>('/api/token/', { username, password })

export const refreshToken = (refresh: string) =>
  client.post<AuthTokens>('/api/token/refresh/', { refresh })

export const getMe = () => client.get<AuthUser>('/api/profile/')

export interface UpdateProfilePayload {
  username?: string
  email?: string
  current_password?: string
  new_password?: string
}

export const updateProfile = (payload: UpdateProfilePayload) =>
  client.patch<AuthUser>('/api/profile/', payload)
