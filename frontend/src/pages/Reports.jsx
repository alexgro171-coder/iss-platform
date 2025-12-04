import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { workersAPI, clientsAPI } from '../services/api'
import './Reports.css'

/**
 * Pagina de Rapoarte și Statistici - doar Management/Admin
 */
function Reports() {
  const { isManagementOrAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [statistics, setStatistics] = useState(null)
  const [clients, setClients] = useState([])
  const [workers, setWorkers] = useState([])

  // Filtre pentru statistici
  const [statFilters, setStatFilters] = useState({
    status: '',
    cetatenie: '',
  })

  // Filtre avansate pentru raport
  const [filters, setFilters] = useState({
    nume: '',
    status: '',
    cetatenie: '',
    client_id: '',
    cod_cor: '',
    luna_wp: '',
    anul_wp: '',
    luna_viza: '',
    anul_viza: '',
    luna_cim: '',
    anul_cim: '',
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [statsData, clientsData] = await Promise.all([
        fetchStatistics(),
        clientsAPI.getAll()
      ])
      setStatistics(statsData)
      setClients(clientsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async (params = {}) => {
    const token = localStorage.getItem('access_token')
    const queryString = new URLSearchParams(params).toString()
    const response = await fetch(`/api/workers/statistics/?${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) throw new Error('Failed to fetch statistics')
    return response.json()
  }

  const handleStatFilterChange = async (e) => {
    const newFilters = { ...statFilters, [e.target.name]: e.target.value }
    setStatFilters(newFilters)
    
    // Reîncarcă statisticile cu filtrele noi
    const cleanFilters = {}
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) cleanFilters[key] = value
    })
    
    try {
      const data = await fetchStatistics(cleanFilters)
      setStatistics(data)
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const handleFilterChange = (e) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const cleanFilters = {}
      Object.entries(filters).forEach(([key, value]) => {
        if (value) cleanFilters[key] = value
      })
      const data = await workersAPI.getAll(cleanFilters)
      setWorkers(data)
    } catch (error) {
      console.error('Error loading workers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setFilters({
      nume: '',
      status: '',
      cetatenie: '',
      client_id: '',
      cod_cor: '',
      luna_wp: '',
      anul_wp: '',
      luna_viza: '',
      anul_viza: '',
      luna_cim: '',
      anul_cim: '',
    })
    setWorkers([])
  }

  // Export Excel
  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const cleanFilters = {}
      Object.entries(filters).forEach(([key, value]) => {
        if (value) cleanFilters[key] = value
      })
      
      const params = new URLSearchParams(cleanFilters).toString()
      const token = localStorage.getItem('access_token')
      
      const response = await fetch(`/api/workers/export_excel/?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Eroare la export')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `raport_lucratori_${new Date().toISOString().slice(0,10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Eroare la export: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  // Export PDF
  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const cleanFilters = {}
      Object.entries(filters).forEach(([key, value]) => {
        if (value) cleanFilters[key] = value
      })
      
      const params = new URLSearchParams(cleanFilters).toString()
      const token = localStorage.getItem('access_token')
      
      const response = await fetch(`/api/workers/export_pdf/?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Eroare la export')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `raport_lucratori_${new Date().toISOString().slice(0,10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Eroare la export: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  // Verifică permisiunile
  if (!isManagementOrAdmin()) {
    return (
      <div className="reports-page">
        <div className="access-denied card">
          <span className="icon">🔒</span>
          <h2>Acces Restricționat</h2>
          <p>Această pagină este disponibilă doar pentru Management și Admin.</p>
        </div>
      </div>
    )
  }

  // Luni și ani pentru dropdown-uri
  const months = [
    { value: '1', label: 'Ianuarie' }, { value: '2', label: 'Februarie' },
    { value: '3', label: 'Martie' }, { value: '4', label: 'Aprilie' },
    { value: '5', label: 'Mai' }, { value: '6', label: 'Iunie' },
    { value: '7', label: 'Iulie' }, { value: '8', label: 'August' },
    { value: '9', label: 'Septembrie' }, { value: '10', label: 'Octombrie' },
    { value: '11', label: 'Noiembrie' }, { value: '12', label: 'Decembrie' },
  ]
  
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i)

  const statusOptions = statistics?.available_statuses || []
  const countries = statistics?.available_countries || []

  if (loading && !statistics) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Se încarcă statisticile...</p>
      </div>
    )
  }

  return (
    <div className="reports-page">
      <header className="page-header">
        <div>
          <h1>📊 Rapoarte și Statistici</h1>
          <p>Dashboard pentru Management</p>
        </div>
      </header>

      {/* STATISTICI */}
      <section className="stats-section">
        <div className="section-header">
          <h2>Statistici Candidați</h2>
          <div className="stat-filters">
            <select 
              name="status" 
              value={statFilters.status} 
              onChange={handleStatFilterChange}
            >
              <option value="">Toate statusurile</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select 
              name="cetatenie" 
              value={statFilters.cetatenie} 
              onChange={handleStatFilterChange}
            >
              <option value="">Toate țările</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card total">
            <span className="kpi-icon">👥</span>
            <div className="kpi-content">
              <span className="kpi-value">{statistics?.total || 0}</span>
              <span className="kpi-label">Total Candidați</span>
            </div>
          </div>
          
          {statistics?.by_status?.slice(0, 3).map((item, index) => (
            <div key={index} className={`kpi-card status-${index}`}>
              <span className="kpi-icon">📋</span>
              <div className="kpi-content">
                <span className="kpi-value">{item.count}</span>
                <span className="kpi-label">{item.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Grafice / Tabele */}
        <div className="stats-grid">
          {/* Pe Status */}
          <div className="stat-card card">
            <h3>📊 Distribuție pe Status</h3>
            <div className="stat-bars">
              {statistics?.by_status?.map((item, index) => (
                <div key={index} className="stat-bar-item">
                  <div className="stat-bar-header">
                    <span className="stat-bar-label">{item.status}</span>
                    <span className="stat-bar-value">{item.count}</span>
                  </div>
                  <div className="stat-bar-track">
                    <div 
                      className="stat-bar-fill"
                      style={{ 
                        width: `${(item.count / (statistics?.total || 1)) * 100}%`,
                        backgroundColor: getStatusColor(index)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pe Țară */}
          <div className="stat-card card">
            <h3>🌍 Distribuție pe Țară</h3>
            <div className="stat-table">
              <table>
                <thead>
                  <tr>
                    <th>Țară</th>
                    <th>Candidați</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics?.by_country?.slice(0, 10).map((item, index) => (
                    <tr key={index}>
                      <td>{item.cetatenie || 'Nespecificat'}</td>
                      <td>{item.count}</td>
                      <td>{((item.count / (statistics?.total || 1)) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pe Client */}
          <div className="stat-card card">
            <h3>🏢 Top 10 Clienți</h3>
            <div className="stat-table">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Lucrători</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics?.by_client?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.client__denumire}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                  {(!statistics?.by_client || statistics.by_client.length === 0) && (
                    <tr>
                      <td colSpan="2" className="text-muted">Niciun client asignat</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* RAPORT AVANSAT */}
      <section className="report-section">
        <div className="section-header">
          <h2>Raport Avansat cu Filtre</h2>
        </div>

        <form className="filters-card card" onSubmit={handleSearch}>
          <div className="filters-grid expanded">
            {/* Rând 1: Filtre de bază */}
            <div className="filter-group">
              <label>Nume / Prenume</label>
              <input
                type="text"
                name="nume"
                value={filters.nume}
                onChange={handleFilterChange}
                placeholder="Caută după nume..."
              />
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="">Toate</option>
                {statusOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Cetățenie</label>
              <select name="cetatenie" value={filters.cetatenie} onChange={handleFilterChange}>
                <option value="">Toate țările</option>
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Client</label>
              <select name="client_id" value={filters.client_id} onChange={handleFilterChange}>
                <option value="">Toți clienții</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.denumire}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Cod COR</label>
              <input
                type="text"
                name="cod_cor"
                value={filters.cod_cor}
                onChange={handleFilterChange}
                placeholder="ex: 7214"
              />
            </div>

            {/* Rând 2: Work Permit */}
            <div className="filter-group">
              <label>Luna WP</label>
              <select name="luna_wp" value={filters.luna_wp} onChange={handleFilterChange}>
                <option value="">Toate</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Anul WP</label>
              <select name="anul_wp" value={filters.anul_wp} onChange={handleFilterChange}>
                <option value="">Toți</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Rând 3: Viză */}
            <div className="filter-group">
              <label>Luna Viză</label>
              <select name="luna_viza" value={filters.luna_viza} onChange={handleFilterChange}>
                <option value="">Toate</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Anul Viză</label>
              <select name="anul_viza" value={filters.anul_viza} onChange={handleFilterChange}>
                <option value="">Toți</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Rând 4: CIM */}
            <div className="filter-group">
              <label>Luna CIM</label>
              <select name="luna_cim" value={filters.luna_cim} onChange={handleFilterChange}>
                <option value="">Toate</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Anul CIM</label>
              <select name="anul_cim" value={filters.anul_cim} onChange={handleFilterChange}>
                <option value="">Toți</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filters-actions">
            <button type="button" className="btn btn-secondary" onClick={handleClearFilters}>
              Resetează
            </button>
            <button type="submit" className="btn btn-primary">
              🔍 Generează Raport
            </button>
          </div>
        </form>

        {/* Rezultate și Export */}
        {workers.length > 0 && (
          <div className="results-section">
            <div className="results-header">
              <h3>Rezultate: {workers.length} candidați</h3>
              <div className="export-buttons">
                <button 
                  className="btn btn-success" 
                  onClick={handleExportExcel}
                  disabled={exporting}
                >
                  📊 Export Excel
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleExportPDF}
                  disabled={exporting}
                >
                  📄 Export PDF
                </button>
              </div>
            </div>

            <div className="card">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nume</th>
                      <th>Cetățenie</th>
                      <th>Pașaport</th>
                      <th>Status</th>
                      <th>Client</th>
                      <th>Data WP</th>
                      <th>Data CIM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.slice(0, 50).map((worker, index) => (
                      <tr key={worker.id}>
                        <td>{index + 1}</td>
                        <td>{worker.nume} {worker.prenume}</td>
                        <td>{worker.cetatenie || '-'}</td>
                        <td className="mono">{worker.pasaport_nr}</td>
                        <td>
                          <span className={`badge badge-${getStatusBadge(worker.status)}`}>
                            {worker.status}
                          </span>
                        </td>
                        <td>{worker.client_denumire || '-'}</td>
                        <td>{worker.data_programare_wp || '-'}</td>
                        <td>{worker.data_emitere_cim || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {workers.length > 50 && (
                <p className="text-muted text-center mt-2">
                  Se afișează primele 50 din {workers.length} rezultate. Exportă pentru lista completă.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// Helper functions
function getStatusColor(index) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
  return colors[index % colors.length]
}

function getStatusBadge(status) {
  const map = {
    'Activ': 'success',
    'Viza obtinuta': 'success',
    'Permis de sedere emis': 'success',
    'Sosit cu CIM semnat': 'success',
    'Aviz emis': 'success',
    'Viza solicitata': 'warning',
    'Aviz solicitat': 'warning',
    'Permis de sedere solicitat': 'warning',
    'Viza redepusa': 'warning',
    'Viza respinsa': 'danger',
    'Candidat retras': 'danger',
    'Suspendat': 'danger',
    'Inactiv': 'danger',
  }
  return map[status] || 'info'
}

export default Reports

