import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  children: React.ReactNode
  module?: string
}

export default function ProtectedRoute({ children, module }: Props) {
  const { session, modules, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <p className="text-gray-400 text-sm">جاري التحميل...</p>
    </div>
  )

  if (!session) return <Navigate to="/login" replace />

  if (module && !modules.includes(module)) return <Navigate to="/" replace />

  return <>{children}</>
}
