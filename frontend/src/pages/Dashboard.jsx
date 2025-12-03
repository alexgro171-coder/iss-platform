import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { workersAPI, clientsAPI } from '../services/api'
import './Dashboard.css'

/**
 * Dashboard principal - arată statistici și acces rapid.
 */
function Dashboard() {
  const { user, isManagementOrAdmin } = useAuth()
  const [stats, setStats] = useState({
    totalWorkers: 0,
    activeWorkers: 0,
    pendingVisa: 0,
    totalClients: 0,
  })
  const [recentWorkers, setRecentWorkers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Încarcă lucrătorii
      const workers = await workersAPI.getAll()
      
      // Calculează statistici
      const activeCount = workers.filter(w => w.status === 'Activ').length
      const pendingVisa = workers.filter(w => 
        ['Viza solicitata', 'Aviz solicitat', 'Aviz emis'].includes(w.status)
      ).length

      setStats(prev => ({
        ...prev,
        totalWorkers: workers.length,
        activeWorkers: activeCount,
        pendingVisa: pendingVisa,
      }))

      // Ultimii 5 lucrători adăugați
      setRecentWorkers(workers.slice(0, 5))

      // Încarcă clienții (doar pentru Management/Admin)
      if (isManagementOrAdmin()) {
        const clients = await clientsAPI.getAll()
        setStats(prev => ({
          ...prev,
          totalClients: clients.length,
        }))
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Statusuri cu culori
  const statusColors = {
    'Activ': 'success',
    'Aviz solicitat': 'info',
    'Aviz emis': 'info',
    'Viza solicitata': 'warning',
    'Viza obtinuta': 'success',
    'Viza respinsa': 'danger',
    'Viza redepusa': 'warning',
    'Candidat retras': 'danger',
    'Sosit cu CIM semnat': 'success',
    'Permis de sedere solicitat': 'warning',
    'Permis de sedere emis': 'success',
    'Suspendat': 'danger',
    'Inactiv': 'danger',
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Se încarcă datele...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Bine ai venit, {user?.username}!</p>
        </div>
        <Link to="/workers/new" className="btn btn-primary">
          + Adaugă Lucrător
        </Link>
      </header>

      {/* Carduri Statistici */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalWorkers}</span>
            <span className="stat-label">Total Lucrători</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.activeWorkers}</span>
            <span className="stat-label">Lucrători Activi</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon yellow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.pendingVisa}</span>
            <span className="stat-label">În Așteptare Viză</span>
          </div>
        </div>

        {isManagementOrAdmin() && (
          <div className="stat-card">
            <div className="stat-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalClients}</span>
              <span className="stat-label">Clienți</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabel Lucrători Recenți */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Lucrători Recenți</h2>
          <Link to="/workers" className="btn btn-secondary">
            Vezi toți
          </Link>
        </div>

        {recentWorkers.length > 0 ? (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nume</th>
                  <th>Pașaport</th>
                  <th>Cetățenie</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentWorkers.map((worker) => (
                  <tr key={worker.id}>
                    <td>
                      <Link to={`/workers/${worker.id}`} className="worker-name">
                        {worker.nume} {worker.prenume}
                      </Link>
                    </td>
                    <td className="passport-nr">{worker.pasaport_nr}</td>
                    <td>{worker.cetatenie || '-'}</td>
                    <td>
                      <span className={`badge badge-${statusColors[worker.status] || 'info'}`}>
                        {worker.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>Nu există lucrători înregistrați.</p>
            <Link to="/workers/new" className="btn btn-primary">
              Adaugă primul lucrător
            </Link>
          </div>
        )}
      </div>

      {/* Info roluri */}
      <div className="role-info card">
        <h3>Rolul tău: {user?.role}</h3>
        <ul>
          {user?.role === 'Agent' && (
            <>
              <li>✅ Poți adăuga și edita lucrători</li>
              <li>✅ Poți vizualiza doar lucrătorii tăi</li>
              <li>❌ Nu poți șterge înregistrări</li>
            </>
          )}
          {user?.role === 'Expert' && (
            <>
              <li>✅ Poți vizualiza toți lucrătorii</li>
              <li>✅ Poți edita și șterge lucrători</li>
              <li>❌ Nu poți gestiona clienții</li>
            </>
          )}
          {(user?.role === 'Management' || user?.role === 'Admin') && (
            <>
              <li>✅ Acces complet la toate modulele</li>
              <li>✅ Poți gestiona lucrători și clienți</li>
              <li>✅ Poți exporta rapoarte</li>
            </>
          )}
        </ul>
      </div>
    </div>
  )
}

export default Dashboard

