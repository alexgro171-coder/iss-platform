import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

// Crează contextul
const AuthContext = createContext(null)

// Provider-ul pentru autentificare
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Verifică dacă utilizatorul este deja logat (la încărcarea aplicației)
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token')
      
      if (token) {
        try {
          // Obține informațiile utilizatorului
          const userData = await authAPI.getCurrentUser()
          setUser(userData)
        } catch (error) {
          // Token invalid sau expirat
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          setUser(null)
        }
      }
      
      setLoading(false)
    }

    checkAuth()
  }, [])

  // Funcția de login
  const login = async (username, password) => {
    try {
      // Obține token-urile
      const tokens = await authAPI.login(username, password)
      
      // Salvează token-urile
      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)
      
      // Obține informațiile utilizatorului
      const userData = await authAPI.getCurrentUser()
      setUser(userData)
      
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.detail || 'Eroare la autentificare'
      return { success: false, error: message }
    }
  }

  // Funcția de logout
  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  // Verifică dacă utilizatorul are un anumit rol
  const hasRole = (roles) => {
    if (!user) return false
    if (typeof roles === 'string') return user.role === roles
    return roles.includes(user.role)
  }

  // Verifică dacă poate șterge (nu e Agent)
  const canDelete = () => {
    return user && user.role !== 'Agent'
  }

  // Verifică dacă e Management sau Admin
  const isManagementOrAdmin = () => {
    return user && ['Management', 'Admin'].includes(user.role)
  }

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    canDelete,
    isManagementOrAdmin,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook pentru a folosi contextul
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

