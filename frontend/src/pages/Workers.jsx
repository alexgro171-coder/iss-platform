import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { workersAPI, clientsAPI } from '../services/api'
import './Workers.css'

/**
 * Pagina de listare lucrători cu filtre.
 */
function Workers() {
  const { canDelete } = useAuth()
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    cetatenie: '',
    pasaport_nr: '',
    cod_cor: '',
    client_id: '',
    luna_wp: '',
    anul_wp: '',
    luna_viza: '',
    anul_viza: '',
  })
  const [clients, setClients] = useState([])

  // Încarcă lucrătorii și clienții la prima randare
  useEffect(() => {
    loadWorkers()
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const data = await clientsAPI.getAll()
      setClients(data)
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const loadWorkers = async () => {
    setLoading(true)
    try {
      const data = await workersAPI.getAll(filters)
      setWorkers(data)
    } catch (error) {
      console.error('Error loading workers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadWorkers()
  }

  const handleClearFilters = () => {
    setFilters({
      status: '',
      cetatenie: '',
      pasaport_nr: '',
      cod_cor: '',
      client_id: '',
      luna_wp: '',
      anul_wp: '',
      luna_viza: '',
      anul_viza: '',
    })
  }

  // Helper pentru formatare dată
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // Generare ani pentru filtru
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = [
    { value: '1', label: 'Ianuarie' },
    { value: '2', label: 'Februarie' },
    { value: '3', label: 'Martie' },
    { value: '4', label: 'Aprilie' },
    { value: '5', label: 'Mai' },
    { value: '6', label: 'Iunie' },
    { value: '7', label: 'Iulie' },
    { value: '8', label: 'August' },
    { value: '9', label: 'Septembrie' },
    { value: '10', label: 'Octombrie' },
    { value: '11', label: 'Noiembrie' },
    { value: '12', label: 'Decembrie' },
  ]

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Sigur vrei să ștergi lucrătorul "${name}"?`)) {
      return
    }

    try {
      await workersAPI.delete(id)
      setWorkers(workers.filter(w => w.id !== id))
    } catch (error) {
      alert('Eroare la ștergere: ' + (error.response?.data?.detail || error.message))
    }
  }

  // Statusuri disponibile
  const statusOptions = [
    'Aviz solicitat',
    'Aviz emis',
    'Viza solicitata',
    'Viza obtinuta',
    'Viza respinsa',
    'Viza redepusa',
    'Candidat retras',
    'Sosit cu CIM semnat',
    'Permis de sedere solicitat',
    'Permis de sedere emis',
    'Activ',
    'Suspendat',
    'Inactiv',
  ]

  // Culori status
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

  return (
    <div className="workers-page">
      <header className="page-header">
        <div>
          <h1>Lucrători</h1>
          <p>{workers.length} înregistrări</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => alert('Export Excel - în dezvoltare')}>
            📊 Export Excel
          </button>
          <button className="btn btn-secondary" onClick={() => alert('Export PDF - în dezvoltare')}>
            📄 Export PDF
          </button>
          <Link to="/workers/new" className="btn btn-primary">
            + Adaugă Lucrător
          </Link>
        </div>
      </header>

      {/* Filtre */}
      <form className="filters-card card" onSubmit={handleSearch}>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Status</label>
            <select 
              name="status" 
              value={filters.status} 
              onChange={handleFilterChange}
            >
              <option value="">Toate</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Cetățenie</label>
            <input
              type="text"
              name="cetatenie"
              value={filters.cetatenie}
              onChange={handleFilterChange}
              placeholder="ex: Ucraina"
            />
          </div>

          <div className="filter-group">
            <label>Nr. Pașaport</label>
            <input
              type="text"
              name="pasaport_nr"
              value={filters.pasaport_nr}
              onChange={handleFilterChange}
              placeholder="Caută după pașaport"
            />
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

          <div className="filter-group">
            <label>Client</label>
            <select 
              name="client_id" 
              value={filters.client_id} 
              onChange={handleFilterChange}
            >
              <option value="">Toți clienții</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.denumire}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Luna WP</label>
            <select 
              name="luna_wp" 
              value={filters.luna_wp} 
              onChange={handleFilterChange}
            >
              <option value="">Toate</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Anul WP</label>
            <select 
              name="anul_wp" 
              value={filters.anul_wp} 
              onChange={handleFilterChange}
            >
              <option value="">Toți anii</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Luna Viză</label>
            <select 
              name="luna_viza" 
              value={filters.luna_viza} 
              onChange={handleFilterChange}
            >
              <option value="">Toate</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Anul Viză</label>
            <select 
              name="anul_viza" 
              value={filters.anul_viza} 
              onChange={handleFilterChange}
            >
              <option value="">Toți anii</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filters-actions">
          <button type="button" className="btn btn-secondary" onClick={handleClearFilters}>
            Resetează
          </button>
          <button type="submit" className="btn btn-primary">
            Caută
          </button>
        </div>
      </form>

      {/* Tabel */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Se încarcă...</p>
        </div>
      ) : workers.length > 0 ? (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nume Complet</th>
                  <th>Pașaport</th>
                  <th>Cetățenie</th>
                  <th>Cod COR</th>
                  <th>Client</th>
                  <th>Data Prog. WP</th>
                  <th>Status</th>
                  <th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.id}>
                    <td>
                      <Link to={`/workers/${worker.id}`} className="worker-link">
                        <span className="worker-name">{worker.nume} {worker.prenume}</span>
                      </Link>
                    </td>
                    <td className="mono">{worker.pasaport_nr}</td>
                    <td>{worker.cetatenie || '-'}</td>
                    <td className="mono">{worker.cod_cor || '-'}</td>
                    <td>{worker.client_denumire || '-'}</td>
                    <td className="mono">{formatDate(worker.data_programare_wp)}</td>
                    <td>
                      <span className={`badge badge-${statusColors[worker.status] || 'info'}`}>
                        {worker.status}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <Link 
                          to={`/workers/${worker.id}`} 
                          className="btn-icon"
                          title="Editează"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>
                        {canDelete() && (
                          <button
                            className="btn-icon danger"
                            onClick={() => handleDelete(worker.id, `${worker.nume} ${worker.prenume}`)}
                            title="Șterge"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="17" y1="11" x2="23" y2="11" />
          </svg>
          <h3>Niciun lucrător găsit</h3>
          <p>Nu există lucrători care să corespundă criteriilor de căutare.</p>
          <Link to="/workers/new" className="btn btn-primary">
            Adaugă primul lucrător
          </Link>
        </div>
      )}
    </div>
  )
}

export default Workers

