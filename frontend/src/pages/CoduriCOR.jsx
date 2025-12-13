import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { coduriCORAPI } from '../services/api'
import './CoduriCOR.css'

/**
 * Pagina de gestionare Coduri COR.
 * Accesibilă pentru Management și Admin.
 */
function CoduriCOR() {
  const { isManagementOrAdmin } = useAuth()
  const [coduri, setCoduri] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCod, setEditingCod] = useState(null)
  const [formData, setFormData] = useState({
    cod: '',
    denumire_ro: '',
    denumire_en: '',
    activ: true,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCoduri()
  }, [])

  const loadCoduri = async () => {
    setLoading(true)
    try {
      const data = await coduriCORAPI.getAll()
      setCoduri(data)
    } catch (err) {
      console.error('Error loading coduri COR:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearch(e.target.value)
  }

  const filteredCoduri = coduri.filter(cod => 
    cod.cod.toLowerCase().includes(search.toLowerCase()) ||
    cod.denumire_ro.toLowerCase().includes(search.toLowerCase()) ||
    cod.denumire_en.toLowerCase().includes(search.toLowerCase())
  )

  const openAddModal = () => {
    setEditingCod(null)
    setFormData({
      cod: '',
      denumire_ro: '',
      denumire_en: '',
      activ: true,
    })
    setError('')
    setShowModal(true)
  }

  const openEditModal = (cod) => {
    setEditingCod(cod)
    setFormData({
      cod: cod.cod,
      denumire_ro: cod.denumire_ro,
      denumire_en: cod.denumire_en,
      activ: cod.activ,
    })
    setError('')
    setShowModal(true)
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (editingCod) {
        await coduriCORAPI.update(editingCod.id, formData)
      } else {
        await coduriCORAPI.create(formData)
      }
      setShowModal(false)
      loadCoduri()
    } catch (err) {
      const errorMsg = err.response?.data
      if (typeof errorMsg === 'object') {
        const firstError = Object.values(errorMsg)[0]
        setError(Array.isArray(firstError) ? firstError[0] : firstError)
      } else {
        setError('Eroare la salvare')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cod) => {
    if (!window.confirm(`Sigur vrei să ștergi codul COR "${cod.cod} - ${cod.denumire_ro}"?`)) {
      return
    }

    try {
      await coduriCORAPI.delete(cod.id)
      loadCoduri()
    } catch (err) {
      alert('Eroare la ștergere: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleToggleActiv = async (cod) => {
    try {
      await coduriCORAPI.update(cod.id, { activ: !cod.activ })
      loadCoduri()
    } catch (err) {
      alert('Eroare la actualizare: ' + (err.response?.data?.detail || err.message))
    }
  }

  if (!isManagementOrAdmin()) {
    return (
      <div className="coduri-cor-page">
        <div className="access-denied card">
          <h2>⛔ Acces restricționat</h2>
          <p>Doar utilizatorii cu rol Management sau Admin pot gestiona Codurile COR.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="coduri-cor-page">
      <header className="page-header">
        <div>
          <h1>📋 Nomenclator Coduri COR</h1>
          <p>{coduri.length} coduri înregistrate</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            + Adaugă Cod COR
          </button>
        </div>
      </header>

      {/* Căutare */}
      <div className="search-bar card">
        <input
          type="text"
          placeholder="Caută după cod sau denumire..."
          value={search}
          onChange={handleSearch}
          className="search-input"
        />
        <span className="search-count">{filteredCoduri.length} rezultate</span>
      </div>

      {/* Tabel */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Se încarcă...</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cod</th>
                  <th>Denumire RO</th>
                  <th>Denumire EN</th>
                  <th>Status</th>
                  <th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoduri.map(cod => (
                  <tr key={cod.id} className={!cod.activ ? 'inactive-row' : ''}>
                    <td className="mono">{cod.cod}</td>
                    <td>{cod.denumire_ro}</td>
                    <td>{cod.denumire_en || '-'}</td>
                    <td>
                      <button
                        className={`status-toggle ${cod.activ ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleActiv(cod)}
                        title={cod.activ ? 'Click pentru dezactivare' : 'Click pentru activare'}
                      >
                        {cod.activ ? '✓ Activ' : '✗ Inactiv'}
                      </button>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn-icon"
                          onClick={() => openEditModal(cod)}
                          title="Editează"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDelete(cod)}
                          title="Șterge"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCoduri.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-message">
                      Nu s-au găsit coduri COR.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Adaugă/Editează */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCod ? 'Editează Cod COR' : 'Adaugă Cod COR Nou'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {error && <div className="error-banner">{error}</div>}
              
              <div className="form-group">
                <label>Cod numeric *</label>
                <input
                  type="text"
                  name="cod"
                  value={formData.cod}
                  onChange={handleFormChange}
                  placeholder="ex: 721410"
                  required
                  disabled={editingCod}
                />
                {editingCod && (
                  <small className="help-text">Codul nu poate fi modificat</small>
                )}
              </div>

              <div className="form-group">
                <label>Denumire în Română *</label>
                <input
                  type="text"
                  name="denumire_ro"
                  value={formData.denumire_ro}
                  onChange={handleFormChange}
                  placeholder="ex: Sudor electric"
                  required
                />
              </div>

              <div className="form-group">
                <label>Denumire în Engleză</label>
                <input
                  type="text"
                  name="denumire_en"
                  value={formData.denumire_en}
                  onChange={handleFormChange}
                  placeholder="ex: Electric Welder"
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="activ"
                    checked={formData.activ}
                    onChange={handleFormChange}
                  />
                  Cod activ (poate fi selectat)
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Anulează
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Se salvează...' : (editingCod ? 'Salvează' : 'Adaugă')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CoduriCOR

