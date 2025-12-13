import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

/**
 * Layout principal al aplicației.
 * Include sidebar-ul cu navigare și zona de conținut.
 */
function Layout() {
  const { user, logout, isManagementOrAdmin, isExpertOrAbove, getUserRights } = useAuth()
  const navigate = useNavigate()
  const [showRights, setShowRights] = useState(false)

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
    reports: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    import: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
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

          {/* Rapoarte - accesibil pentru Expert și mai sus */}
          {isExpertOrAbove() && (
            <NavLink to="/reports" className="nav-item">
              {icons.reports}
              <span>Rapoarte</span>
            </NavLink>
          )}

          {/* Import Bulk - doar Management/Admin */}
          {isManagementOrAdmin() && (
            <NavLink to="/import-bulk" className="nav-item">
              {icons.import}
              <span>Import Bulk</span>
            </NavLink>
          )}

          {/* Coduri COR - doar Management/Admin */}
          {isManagementOrAdmin() && (
            <NavLink to="/coduri-cor" className="nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              <span>Coduri COR</span>
            </NavLink>
          )}

          {/* Template-uri - accesibil pentru Expert și mai sus */}
          {isExpertOrAbove() && (
            <NavLink to="/templates" className="nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M12 18v-6" />
                <path d="M9 15h6" />
              </svg>
              <span>Template-uri</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          {/* Panel drepturi utilizator */}
          {showRights && (
            <div className="rights-panel">
              <div className="rights-header">
                <span>Drepturi {user?.role}</span>
                <button onClick={() => setShowRights(false)} className="close-rights">×</button>
              </div>
              <ul className="rights-list">
                {getUserRights().map((right, idx) => (
                  <li key={idx}>✓ {right}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="user-info" onClick={() => setShowRights(!showRights)} style={{ cursor: 'pointer' }}>
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

