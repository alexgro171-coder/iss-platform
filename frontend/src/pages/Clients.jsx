import { useState, useEffect } from 'react'
import { clientsAPI } from '../services/api'
import './Clients.css'

/**
 * Pagina de gestionare clienți (doar Management/Admin).
 */
function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    denumire: '',
    tara: '',
    oras: '',
    judet: '',
    adresa: '',
    cod_fiscal: '',
    tarif_orar: '',
    nr_ore_minim: '',
    cazare_cost: '',
    masa_cost: '',
    transport_cost: '',
  })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const data = await clientsAPI.getAll()
      setClients(data)
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      denumire: '',
      tara: '',
      oras: '',
      judet: '',
      adresa: '',
      cod_fiscal: '',
      tarif_orar: '',
      nr_ore_minim: '',
      cazare_cost: '',
      masa_cost: '',
      transport_cost: '',
    })
    setEditingClient(null)
    setError('')
  }

  const handleAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (client) => {
    setFormData({
      denumire: client.denumire || '',
      tara: client.tara || '',
      oras: client.oras || '',
      judet: client.judet || '',
      adresa: client.adresa || '',
      cod_fiscal: client.cod_fiscal || '',
      tarif_orar: client.tarif_orar || '',
      nr_ore_minim: client.nr_ore_minim || '',
      cazare_cost: client.cazare_cost || '',
      masa_cost: client.masa_cost || '',
      transport_cost: client.transport_cost || '',
    })
    setEditingClient(client)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    resetForm()
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Pregătește datele
      const dataToSend = {
        ...formData,
        tarif_orar: formData.tarif_orar || 0,
        nr_ore_minim: formData.nr_ore_minim || 0,
        cazare_cost: formData.cazare_cost || 0,
        masa_cost: formData.masa_cost || 0,
        transport_cost: formData.transport_cost || 0,
      }

      if (editingClient) {
        await clientsAPI.update(editingClient.id, dataToSend)
      } else {
        await clientsAPI.create(dataToSend)
      }

      await loadClients()
      setShowForm(false)
      resetForm()
    } catch (error) {
      const errorMsg = error.response?.data
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Sigur vrei să ștergi clientul "${name}"?`)) {
      return
    }

    try {
      await clientsAPI.delete(id)
      setClients(clients.filter(c => c.id !== id))
    } catch (error) {
      alert('Eroare la ștergere')
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Se încarcă...</p>
      </div>
    )
  }

  return (
    <div className="clients-page">
      <header className="page-header">
        <div>
          <h1>Clienți</h1>
          <p>{clients.length} înregistrări</p>
        </div>
        <button className="btn btn-primary" onClick={handleAdd}>
          + Adaugă Client
        </button>
      </header>

      {/* Formular Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content card" onClick={e => e.stopPropagation()}>
            <h2>{editingClient ? 'Editare Client' : 'Client Nou'}</h2>
            
            <form onSubmit={handleSubmit}>
              {error && <div className="error-banner">{error}</div>}
              
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Denumire *</label>
                  <input
                    type="text"
                    name="denumire"
                    value={formData.denumire}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Țară</label>
                  <input
                    type="text"
                    name="tara"
                    value={formData.tara}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Județ</label>
                  <input
                    type="text"
                    name="judet"
                    value={formData.judet}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Oraș</label>
                  <input
                    type="text"
                    name="oras"
                    value={formData.oras}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Cod Fiscal</label>
                  <input
                    type="text"
                    name="cod_fiscal"
                    value={formData.cod_fiscal}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group full-width">
                  <label>Adresă</label>
                  <input
                    type="text"
                    name="adresa"
                    value={formData.adresa}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Tarif orar (RON)</label>
                  <input
                    type="number"
                    name="tarif_orar"
                    value={formData.tarif_orar}
                    onChange={handleChange}
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label>Nr. ore minim</label>
                  <input
                    type="number"
                    name="nr_ore_minim"
                    value={formData.nr_ore_minim}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Cost cazare (RON)</label>
                  <input
                    type="number"
                    name="cazare_cost"
                    value={formData.cazare_cost}
                    onChange={handleChange}
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label>Cost masă (RON)</label>
                  <input
                    type="number"
                    name="masa_cost"
                    value={formData.masa_cost}
                    onChange={handleChange}
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label>Cost transport (RON)</label>
                  <input
                    type="number"
                    name="transport_cost"
                    value={formData.transport_cost}
                    onChange={handleChange}
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                  Anulează
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Se salvează...' : 'Salvează'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabel Clienți */}
      {clients.length > 0 ? (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Denumire</th>
                  <th>Locație</th>
                  <th>Cod Fiscal</th>
                  <th>Tarif/oră</th>
                  <th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="client-name">{client.denumire}</td>
                    <td>
                      {[client.oras, client.judet, client.tara].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="mono">{client.cod_fiscal || '-'}</td>
                    <td>{client.tarif_orar ? `${client.tarif_orar} RON` : '-'}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn-icon"
                          onClick={() => handleEdit(client)}
                          title="Editează"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDelete(client.id, client.denumire)}
                          title="Șterge"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
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
          <h3>Niciun client înregistrat</h3>
          <p>Adaugă primul client pentru a putea atribui lucrători.</p>
          <button className="btn btn-primary" onClick={handleAdd}>
            Adaugă Client
          </button>
        </div>
      )}
    </div>
  )
}

export default Clients

