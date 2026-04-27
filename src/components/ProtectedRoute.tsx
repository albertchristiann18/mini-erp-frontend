import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
