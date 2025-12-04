import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { workersAPI, clientsAPI } from '../services/api'
import './WorkerForm.css'

/**
 * Formular pentru adăugare/editare lucrător.
 */
function WorkerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState([])

  const [formData, setFormData] = useState({
    nume: '',
    prenume: '',
    cetatenie: '',
    stare_civila: '',
    copii_intretinere: 0,
    sex: '',
    data_nasterii: '',
    pasaport_nr: '',
    data_emitere_pass: '',
    data_exp_pass: '',
    oras_domiciliu: '',
    cod_cor: '',
    dosar_wp_nr: '',
    data_solicitare_wp: '',
    data_programare_wp: '',
    judet_wp: '',
    data_solicitare_viza: '',
    data_programare_interviu: '',
    status: 'Aviz solicitat',
    data_depunere_ps: '',
    data_programare_ps: '',
    cnp: '',
    data_intrare_ro: '',
    cim_nr: '',
    data_emitere_cim: '',
    data_emitere_ps: '',
    data_expirare_ps: '',
    adresa_ro: '',
    client: '',
    observatii: '',
  })

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      // Încarcă lista de clienți
      const clientsData = await clientsAPI.getAll()
      setClients(clientsData)

      // Dacă editează, încarcă datele lucrătorului
      if (isEditing) {
        const worker = await workersAPI.getById(id)
        console.log('Worker data received:', worker)
        setFormData({
          ...worker,
          client: worker.client || '',
          // Asigură-te că valorile null devin stringuri goale pentru input-uri
          nume: worker.nume || '',
          prenume: worker.prenume || '',
          cetatenie: worker.cetatenie || '',
          stare_civila: worker.stare_civila || '',
          sex: worker.sex || '',
          pasaport_nr: worker.pasaport_nr || '',
          oras_domiciliu: worker.oras_domiciliu || '',
          cod_cor: worker.cod_cor || '',
          dosar_wp_nr: worker.dosar_wp_nr || '',
          judet_wp: worker.judet_wp || '',
          cnp: worker.cnp || '',
          cim_nr: worker.cim_nr || '',
          adresa_ro: worker.adresa_ro || '',
          observatii: worker.observatii || '',
          copii_intretinere: worker.copii_intretinere || 0,
          status: worker.status || 'Aviz solicitat',
        })
      }
    } catch (error) {
      console.error('Error loading worker:', error)
      setError(`Eroare la încărcarea datelor: ${error.response?.data?.detail || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Pregătește datele pentru trimitere
      const dataToSend = { ...formData }
      
      // Convertește client la număr sau null
      if (dataToSend.client === '') {
        dataToSend.client = null
      } else {
        dataToSend.client = parseInt(dataToSend.client)
      }

      // Elimină câmpurile goale de date
      Object.keys(dataToSend).forEach(key => {
        if (dataToSend[key] === '') {
          if (key.includes('data_') || key === 'data_nasterii') {
            dataToSend[key] = null
          }
        }
      })

      if (isEditing) {
        await workersAPI.update(id, dataToSend)
      } else {
        await workersAPI.create(dataToSend)
      }

      navigate('/workers')
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

  if (loading) {
    return (
      <div className="form-loading">
        <div className="loading-spinner"></div>
        <p>Se încarcă...</p>
      </div>
    )
  }

  return (
    <div className="worker-form-page">
      <header className="page-header">
        <div>
          <Link to="/workers" className="back-link">
            ← Înapoi la lucrători
          </Link>
          <h1>{isEditing ? 'Editare Lucrător' : 'Adaugă Lucrător Nou'}</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="worker-form card">
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {/* Date Personale */}
        <section className="form-section">
          <h2>Date Personale</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Nume *</label>
              <input
                type="text"
                name="nume"
                value={formData.nume}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Prenume *</label>
              <input
                type="text"
                name="prenume"
                value={formData.prenume}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Cetățenie</label>
              <input
                type="text"
                name="cetatenie"
                value={formData.cetatenie}
                onChange={handleChange}
                placeholder="ex: Ucraina"
              />
            </div>
            <div className="form-group">
              <label>Sex</label>
              <select name="sex" value={formData.sex} onChange={handleChange}>
                <option value="">Selectează</option>
                <option value="M">Masculin</option>
                <option value="F">Feminin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Stare civilă</label>
              <select name="stare_civila" value={formData.stare_civila} onChange={handleChange}>
                <option value="">Selectează</option>
                <option value="M">Măritat/Măritată</option>
                <option value="NM">Nemăritat/Nemăritată</option>
              </select>
            </div>
            <div className="form-group">
              <label>Copii în întreținere</label>
              <input
                type="number"
                name="copii_intretinere"
                value={formData.copii_intretinere}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Data nașterii</label>
              <input
                type="date"
                name="data_nasterii"
                value={formData.data_nasterii || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Oraș domiciliu</label>
              <input
                type="text"
                name="oras_domiciliu"
                value={formData.oras_domiciliu}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Pașaport */}
        <section className="form-section">
          <h2>Date Pașaport</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Număr pașaport *</label>
              <input
                type="text"
                name="pasaport_nr"
                value={formData.pasaport_nr}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Data emitere</label>
              <input
                type="date"
                name="data_emitere_pass"
                value={formData.data_emitere_pass || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Data expirare</label>
              <input
                type="date"
                name="data_exp_pass"
                value={formData.data_exp_pass || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Status și WP */}
        <section className="form-section">
          <h2>Status și Work Permit</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cod COR</label>
              <input
                type="text"
                name="cod_cor"
                value={formData.cod_cor}
                onChange={handleChange}
                placeholder="ex: 721410"
              />
            </div>
            <div className="form-group">
              <label>Nr. dosar WP</label>
              <input
                type="text"
                name="dosar_wp_nr"
                value={formData.dosar_wp_nr}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Județ WP</label>
              <input
                type="text"
                name="judet_wp"
                value={formData.judet_wp}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Data solicitare WP</label>
              <input
                type="date"
                name="data_solicitare_wp"
                value={formData.data_solicitare_wp || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Data programare WP</label>
              <input
                type="date"
                name="data_programare_wp"
                value={formData.data_programare_wp || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Client și Observații */}
        <section className="form-section">
          <h2>Atribuire și Observații</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Client</label>
              <select name="client" value={formData.client || ''} onChange={handleChange}>
                <option value="">Neatribuit</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.denumire}</option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <label>Observații</label>
              <textarea
                name="observatii"
                value={formData.observatii}
                onChange={handleChange}
                rows="3"
                placeholder="Note interne..."
              />
            </div>
          </div>
        </section>

        {/* Butoane */}
        <div className="form-actions">
          <Link to="/workers" className="btn btn-secondary">
            Anulează
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Se salvează...' : (isEditing ? 'Salvează modificările' : 'Adaugă lucrător')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default WorkerForm

