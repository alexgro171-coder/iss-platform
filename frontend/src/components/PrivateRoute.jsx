import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Componenta pentru rute protejate.
 * Redirecționează la login dacă utilizatorul nu e autentificat.
 */
function PrivateRoute() {
  const { user, loading } = useAuth()

  // Afișează loading în timp ce verificăm autentificarea
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Se verifică autentificarea...</p>
      </div>
    )
  }

  // Dacă nu e autentificat, redirecționează la login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Dacă e autentificat, afișează conținutul
  return <Outlet />
}

export default PrivateRoute

