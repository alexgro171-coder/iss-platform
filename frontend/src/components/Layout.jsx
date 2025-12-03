import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

/**
 * Layout principal al aplicației.
 * Include sidebar-ul cu navigare și zona de conținut.
 */
function Layout() {
  const { user, logout, isManagementOrAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Icoane SVG simple
  const icons = {
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    workers: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    clients: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  }

  // Culori pentru roluri
  const roleColors = {
    Agent: '#10b981',
    Expert: '#3b82f6',
    Management: '#f59e0b',
    Admin: '#ef4444',
  }

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">ISS</span>
            <span className="logo-text">Platform</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="nav-item">
            {icons.dashboard}
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/workers" className="nav-item">
            {icons.workers}
            <span>Lucrători</span>
          </NavLink>

          {isManagementOrAdmin() && (
            <NavLink to="/clients" className="nav-item">
              {icons.clients}
              <span>Clienți</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.username}</span>
              <span 
                className="user-role"
                style={{ color: roleColors[user?.role] }}
              >
                {user?.role}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Deconectare">
            {icons.logout}
          </button>
        </div>
      </aside>

      {/* Conținut principal */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout

