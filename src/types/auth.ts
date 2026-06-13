export interface AuthUser {
  id: number
  username: string
  email: string
  is_staff: boolean
  company_id: string | null
  company_name: string | null
  role: string | null
}

export interface AuthTokens {
  access: string
  refresh: string
}
