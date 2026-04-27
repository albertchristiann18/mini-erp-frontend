export interface AuthUser {
  id: number
  username: string
  email: string
  is_staff: boolean
}

export interface AuthTokens {
  access: string
  refresh: string
}
