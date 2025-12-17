import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { workersAPI, clientsAPI, workerDocumentsAPI, coduriCORAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './WorkerForm.css'

/**
 * Formular pentru adăugare/editare lucrător.
 */
function WorkerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEditing = Boolean(id)
  
  // Rolul utilizatorului curent
  const userRole = user?.role || 'Agent'
  const isAgent = userRole === 'Agent'
  const isExpertOrAbove = ['Expert', 'Management', 'Admin'].includes(userRole)
  
  // Statusuri care permit editarea câmpului Funcție
  const STATUSES_ALLOW_FUNCTIE = ['Sosit cu CIM semnat', 'Activ', 'Suspendat', 'Inactiv']

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState([])
  const [coduriCOR, setCoduriCOR] = useState([])
  
  // State pentru documente
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [selectedDocType, setSelectedDocType] = useState('altele')
  const [docDescription, setDocDescription] = useState('')
  const fileInputRef = useRef(null)
  
  // Tipuri de documente disponibile
  const documentTypes = [
    { value: 'pasaport', label: 'Pașaport' },
    { value: 'viza', label: 'Viză' },
    { value: 'aviz_igi', label: 'Aviz IGI' },
    { value: 'cim', label: 'Contract Individual de Muncă' },
    { value: 'permis_sedere', label: 'Permis de Ședere' },
    { value: 'certificat_medical', label: 'Certificat Medical' },
    { value: 'cazier', label: 'Cazier Judiciar' },
    { value: 'diploma', label: 'Diplomă/Certificat Studii' },
    { value: 'cv', label: 'CV' },
    { value: 'foto', label: 'Fotografie' },
    { value: 'contract_cazare', label: 'Contract Cazare' },
    { value: 'altele', label: 'Alte Documente' },
  ]

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
    autoritate_emitenta_pasaport: '',  // Câmp nou - obligatoriu la recrutare
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
    functie: '',  // Câmp nou - completabil doar după sosire
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
      // Încarcă lista de clienți și coduri COR
      const [clientsData, coduriData] = await Promise.all([
        clientsAPI.getAll(),
        coduriCORAPI.getAll({ activ: true })
      ])
      setClients(clientsData)
      setCoduriCOR(coduriData)

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
          autoritate_emitenta_pasaport: worker.autoritate_emitenta_pasaport || '',
          oras_domiciliu: worker.oras_domiciliu || '',
          cod_cor: worker.cod_cor || '',
          dosar_wp_nr: worker.dosar_wp_nr || '',
          judet_wp: worker.judet_wp || '',
          cnp: worker.cnp || '',
          cim_nr: worker.cim_nr || '',
          functie: worker.functie || '',
          adresa_ro: worker.adresa_ro || '',
          observatii: worker.observatii || '',
          copii_intretinere: worker.copii_intretinere || 0,
          status: worker.status || 'Aviz solicitat',
        })
        
        // Încarcă documentele lucrătorului
        try {
          const docs = await workerDocumentsAPI.getByWorkerId(id)
          setDocuments(docs)
        } catch (docError) {
          console.error('Error loading documents:', docError)
        }
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

  // Funcție pentru upload document
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!isEditing || !id) {
      setUploadError('Salvează mai întâi lucrătorul pentru a putea adăuga documente.')
      return
    }

    setUploading(true)
    setUploadError('')

    try {
      const newDoc = await workerDocumentsAPI.upload(id, file, selectedDocType, docDescription)
      setDocuments(prev => [newDoc, ...prev])
      setDocDescription('')
      setSelectedDocType('altele')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Upload error:', err)
      setUploadError(err.response?.data?.detail || 'Eroare la încărcarea fișierului')
    } finally {
      setUploading(false)
    }
  }

  // Funcție pentru ștergere document
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Sigur dorești să ștergi acest document?')) return

    try {
      await workerDocumentsAPI.delete(docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (err) {
      console.error('Delete error:', err)
      setUploadError('Eroare la ștergerea documentului')
    }
  }

  // Formatare dimensiune fișier
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
            <div className="form-group">
              <label>Autoritatea emitentă pașaport {!isEditing && '*'}</label>
              <input
                type="text"
                name="autoritate_emitenta_pasaport"
                value={formData.autoritate_emitenta_pasaport}
                onChange={handleChange}
                placeholder="ex: MAI România, Ambasada..."
                required={!isEditing}
              />
              <small className="help-text">Obligatoriu la introducerea candidatului</small>
            </div>
          </div>
        </section>

        {/* Status */}
        <section className="form-section">
          <h2>Status</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Status curent</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cod COR</label>
              <select name="cod_cor" value={formData.cod_cor} onChange={handleChange}>
                <option value="">Selectează codul COR</option>
                {coduriCOR.map(cor => (
                  <option key={cor.id} value={cor.cod}>
                    {cor.cod} - {cor.denumire_ro}
                  </option>
                ))}
              </select>
              {formData.cod_cor && (
                <small className="help-text">
                  {coduriCOR.find(c => c.cod === formData.cod_cor)?.denumire_en && 
                    `EN: ${coduriCOR.find(c => c.cod === formData.cod_cor)?.denumire_en}`}
                </small>
              )}
            </div>
          </div>
        </section>

        {/* Work Permit / Aviz IGI */}
        <section className="form-section">
          <h2>Work Permit / Aviz IGI</h2>
          <div className="form-grid">
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

        {/* Viză */}
        <section className="form-section">
          <h2>Viză</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Data solicitare viză</label>
              <input
                type="date"
                name="data_solicitare_viza"
                value={formData.data_solicitare_viza || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Data programare interviu</label>
              <input
                type="date"
                name="data_programare_interviu"
                value={formData.data_programare_interviu || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Date România - după sosire */}
        <section className="form-section">
          <h2>Date România (după sosire)</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>CNP</label>
              <input
                type="text"
                name="cnp"
                value={formData.cnp}
                onChange={handleChange}
                maxLength="13"
                placeholder="13 cifre"
              />
            </div>
            <div className="form-group">
              <label>Data intrare în România</label>
              <input
                type="date"
                name="data_intrare_ro"
                value={formData.data_intrare_ro || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Nr. CIM</label>
              <input
                type="text"
                name="cim_nr"
                value={formData.cim_nr}
                onChange={handleChange}
                placeholder="Contract Individual de Muncă"
              />
            </div>
            <div className="form-group">
              <label>Data emitere CIM</label>
              <input
                type="date"
                name="data_emitere_cim"
                value={formData.data_emitere_cim || ''}
                onChange={handleChange}
              />
            </div>
            
            {/* Câmp Funcție - vizibil doar pentru Expert/Management/Admin */}
            {isExpertOrAbove && (
              <div className="form-group">
                <label>
                  Funcție
                  {!STATUSES_ALLOW_FUNCTIE.includes(formData.status) && (
                    <span className="field-locked"> 🔒</span>
                  )}
                </label>
                <input
                  type="text"
                  name="functie"
                  value={formData.functie}
                  onChange={handleChange}
                  placeholder="Funcția după semnarea CIM"
                  disabled={!STATUSES_ALLOW_FUNCTIE.includes(formData.status)}
                />
                {!STATUSES_ALLOW_FUNCTIE.includes(formData.status) && (
                  <small className="help-text warning">
                    Completabil doar pentru statusuri: {STATUSES_ALLOW_FUNCTIE.join(', ')}
                  </small>
                )}
              </div>
            )}
            
            <div className="form-group full-width">
              <label>Adresă în România</label>
              <input
                type="text"
                name="adresa_ro"
                value={formData.adresa_ro}
                onChange={handleChange}
                placeholder="Adresa completă"
              />
            </div>
          </div>
        </section>

        {/* Permis de Ședere */}
        <section className="form-section">
          <h2>Permis de Ședere</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Data depunere PS</label>
              <input
                type="date"
                name="data_depunere_ps"
                value={formData.data_depunere_ps || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Data programare PS</label>
              <input
                type="date"
                name="data_programare_ps"
                value={formData.data_programare_ps || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Data emitere PS</label>
              <input
                type="date"
                name="data_emitere_ps"
                value={formData.data_emitere_ps || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Data expirare PS</label>
              <input
                type="date"
                name="data_expirare_ps"
                value={formData.data_expirare_ps || ''}
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

        {/* Documente */}
        <section className="form-section documents-section">
          <h2>📎 Documente Atașate</h2>
          
          {!isEditing && (
            <div className="documents-notice">
              <p>💡 Salvează lucrătorul pentru a putea adăuga documente.</p>
            </div>
          )}

          {isEditing && (
            <>
              {/* Upload Form */}
              <div className="document-upload-form">
                <div className="upload-row">
                  <div className="form-group">
                    <label>Tip document</label>
                    <select 
                      value={selectedDocType} 
                      onChange={(e) => setSelectedDocType(e.target.value)}
                    >
                      {documentTypes.map(dt => (
                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Descriere (opțional)</label>
                    <input
                      type="text"
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      placeholder="ex: Pașaport principal"
                    />
                  </div>
                  <div className="form-group upload-btn-group">
                    <label>Fișier</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      disabled={uploading}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    />
                  </div>
                </div>
                {uploading && <p className="upload-status">Se încarcă...</p>}
                {uploadError && <p className="upload-error">{uploadError}</p>}
              </div>

              {/* Documents List */}
              {documents.length > 0 ? (
                <div className="documents-list">
                  <table className="documents-table">
                    <thead>
                      <tr>
                        <th>Tip</th>
                        <th>Nume fișier</th>
                        <th>Descriere</th>
                        <th>Mărime</th>
                        <th>Data</th>
                        <th>Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map(doc => (
                        <tr key={doc.id}>
                          <td>
                            <span className={`doc-type-badge doc-type-${doc.document_type}`}>
                              {doc.document_type_display}
                            </span>
                          </td>
                          <td>{doc.original_filename}</td>
                          <td>{doc.description || '-'}</td>
                          <td>{formatFileSize(doc.file_size)}</td>
                          <td>{new Date(doc.uploaded_at).toLocaleDateString('ro-RO')}</td>
                          <td className="doc-actions">
                            <a 
                              href={doc.file} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn-doc btn-download"
                              title="Descarcă"
                            >
                              ⬇️
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="btn-doc btn-delete"
                              title="Șterge"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-documents">Nu există documente atașate.</p>
              )}
            </>
          )}
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

