import { Outlet } from 'react-router-dom'
import { LanguageProvider } from '../../contexts/LanguageContext'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function HoneyLayout() {
  return (
    <LanguageProvider>
      <ProtectedRoute module="honey">
        <Outlet />
      </ProtectedRoute>
    </LanguageProvider>
  )
}
