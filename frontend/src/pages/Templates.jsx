import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { templatesAPI, workersAPI } from '../services/api'
import './Templates.css'

/**
 * Pagina Template-uri - generare și administrare documente.
 * Accesibilă pentru Expert, Management și Admin.
 */
function Templates() {
  const { user, isManagementOrAdmin } = useAuth()
  
  // State pentru template-uri
  const [templateTypes, setTemplateTypes] = useState([])
  const [selectedType, setSelectedType] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // State pentru generare document
  const [workers, setWorkers] = useState([])
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [workerSearch, setWorkerSearch] = useState('')
  const [generating, setGenerating] = useState(false)
  const [outputFormat, setOutputFormat] = useState('docx')
  
  // State pentru upload template (doar Management/Admin)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  
  // State pentru istoricul generărilor
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  
  // State pentru placeholder-uri
  const [showPlaceholders, setShowPlaceholders] = useState(false)
  const [placeholders, setPlaceholders] = useState({})
  
  // State pentru documentul generat și modal de acțiuni
  const [generatedDoc, setGeneratedDoc] = useState(null)
  const [showDocActions, setShowDocActions] = useState(false)

  // Încărcare date inițiale
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [typesData, workersData] = await Promise.all([
        templatesAPI.getTypes(),
        workersAPI.getAll()
      ])
      setTemplateTypes(typesData)
      setWorkers(workersData)
    } catch (err) {
      setError('Eroare la încărcarea datelor: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  // Filtrare lucrători pentru search
  const filteredWorkers = workers.filter(w => {
    const search = workerSearch.toLowerCase()
    return (
      w.nume?.toLowerCase().includes(search) ||
      w.prenume?.toLowerCase().includes(search) ||
      w.pasaport_nr?.toLowerCase().includes(search)
    )
  })

  // Handler pentru generare document - afișează modal cu opțiuni
  const handleGenerate = async () => {
    if (!selectedType || !selectedWorker) {
      alert('Te rog selectează tipul de document și un lucrător.')
      return
    }

    if (!selectedType.has_active_template) {
      alert('Nu există un template activ pentru acest tip de document.')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      // Generăm ambele formate pentru flexibilitate
      const [responseDocx, responsePdf] = await Promise.all([
        templatesAPI.generate(selectedType.value, selectedWorker.id, 'docx'),
        templatesAPI.generate(selectedType.value, selectedWorker.id, 'pdf')
      ])

      // Creăm blob-urile
      const blobDocx = new Blob([responseDocx.data], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      const blobPdf = new Blob([responsePdf.data], { 
        type: 'application/pdf' 
      })

      // Salvăm în state pentru acțiuni ulterioare
      setGeneratedDoc({
        blobDocx,
        blobPdf,
        urlDocx: window.URL.createObjectURL(blobDocx),
        urlPdf: window.URL.createObjectURL(blobPdf),
        filename: `${selectedType.value}_${selectedWorker.nume}_${selectedWorker.prenume}`,
        templateLabel: selectedType.label,
        workerName: `${selectedWorker.nume} ${selectedWorker.prenume}`
      })
      
      // Afișăm modal-ul cu opțiuni
      setShowDocActions(true)
      
    } catch (err) {
      setError('Eroare la generarea documentului: ' + (err.response?.data?.detail || err.message))
    } finally {
      setGenerating(false)
    }
  }

  // Handler pentru descărcare document
  const handleDownload = (format) => {
    if (!generatedDoc) return
    
    const url = format === 'pdf' ? generatedDoc.urlPdf : generatedDoc.urlDocx
    const a = document.createElement('a')
    a.href = url
    a.download = `${generatedDoc.filename}.${format}`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // Handler pentru print document (deschide PDF în fereastră nouă pentru print)
  const handlePrint = () => {
    if (!generatedDoc) return
    
    // Deschidem PDF-ul într-o fereastră nouă și declanșăm print
    const printWindow = window.open(generatedDoc.urlPdf, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  // Închide modal-ul și curăță resursele
  const handleCloseDocActions = () => {
    if (generatedDoc) {
      window.URL.revokeObjectURL(generatedDoc.urlDocx)
      window.URL.revokeObjectURL(generatedDoc.urlPdf)
    }
    setGeneratedDoc(null)
    setShowDocActions(false)
    setSelectedWorker(null)
    setWorkerSearch('')
  }

  // Handler pentru upload template
  const handleUpload = async () => {
    if (!selectedType || !uploadFile) {
      alert('Te rog selectează un tip de template și un fișier.')
      return
    }

    if (!uploadFile.name.endsWith('.docx')) {
      alert('Doar fișiere .docx sunt acceptate.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      await templatesAPI.upload(selectedType.value, uploadFile, uploadDescription)
      
      // Refresh date
      await loadData()
      
      // Resetare form
      setShowUpload(false)
      setUploadFile(null)
      setUploadDescription('')
      
      alert('Template încărcat cu succes!')
    } catch (err) {
      setError('Eroare la încărcarea template-ului: ' + (err.response?.data?.detail || err.message))
    } finally {
      setUploading(false)
    }
  }

  // Încărcare istoric
  const loadHistory = async () => {
    try {
      const data = await templatesAPI.getHistory()
      setHistory(data)
      setShowHistory(true)
    } catch (err) {
      setError('Eroare la încărcarea istoricului.')
    }
  }

  // Încărcare placeholder-uri
  const loadPlaceholders = async () => {
    try {
      const data = await templatesAPI.getPlaceholders()
      setPlaceholders(data)
      setShowPlaceholders(true)
    } catch (err) {
      setError('Eroare la încărcarea placeholder-elor.')
    }
  }

  // Iconuri pentru tipuri de template
  const typeIcons = {
    cerere_work_permit: '📋',
    oferta_angajare: '💼',
    scrisoare_garantie: '📝',
    declaratie: '📄',
    cim: '📑',
  }

  if (loading) {
    return (
      <div className="templates-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Se încarcă template-urile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="templates-page">
      <header className="page-header">
        <div>
          <h1>📄 Template-uri Documente</h1>
          <p>Generează documente pre-completate pentru lucrători</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={loadPlaceholders}
          >
            📖 Placeholder-uri
          </button>
          <button 
            className="btn btn-secondary"
            onClick={loadHistory}
          >
            📜 Istoric
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="templates-layout">
        {/* Panel Stânga - Selectare Template */}
        <div className="templates-sidebar card">
          <h2>1. Selectează Template</h2>
          <div className="template-types-list">
            {templateTypes.map(type => (
              <div
                key={type.value}
                className={`template-type-item ${selectedType?.value === type.value ? 'selected' : ''} ${!type.has_active_template ? 'no-template' : ''}`}
                onClick={() => setSelectedType(type)}
              >
                <span className="template-icon">{typeIcons[type.value] || '📄'}</span>
                <div className="template-info">
                  <span className="template-name">{type.label}</span>
                  <span className={`template-status ${type.has_active_template ? 'active' : 'inactive'}`}>
                    {type.has_active_template ? '✔️ Template activ' : '❌ Fără template'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Buton Upload - doar pentru Management/Admin */}
          {isManagementOrAdmin() && selectedType && (
            <button 
              className="btn btn-outline upload-btn"
              onClick={() => setShowUpload(!showUpload)}
            >
              📤 {selectedType.has_active_template ? 'Înlocuiește Template' : 'Încarcă Template'}
            </button>
          )}
        </div>

        {/* Panel Central - Selectare Lucrător și Generare */}
        <div className="templates-main card">
          <h2>2. Selectează Lucrător</h2>
          
          {selectedType ? (
            <>
              <div className="selected-template-info">
                <span className="template-icon large">{typeIcons[selectedType.value] || '📄'}</span>
                <div>
                  <h3>{selectedType.label}</h3>
                  <p className={selectedType.has_active_template ? 'status-active' : 'status-inactive'}>
                    {selectedType.has_active_template 
                      ? '✔️ Template disponibil' 
                      : '❌ Nu există template activ - încarcă unul din Django Admin sau folosește butonul de upload'}
                  </p>
                </div>
              </div>

              <div className="worker-search-section">
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    placeholder="Caută lucrător după nume sau pașaport..."
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    className="search-input"
                  />
                  {workerSearch && (
                    <button 
                      className="clear-search"
                      onClick={() => setWorkerSearch('')}
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="workers-list">
                  {filteredWorkers.slice(0, 10).map(worker => (
                    <div
                      key={worker.id}
                      className={`worker-item ${selectedWorker?.id === worker.id ? 'selected' : ''}`}
                      onClick={() => setSelectedWorker(worker)}
                    >
                      <div className="worker-avatar">
                        {worker.nume?.charAt(0)}{worker.prenume?.charAt(0)}
                      </div>
                      <div className="worker-details">
                        <span className="worker-name">{worker.nume} {worker.prenume}</span>
                        <span className="worker-info">
                          {worker.pasaport_nr} • {worker.cetatenie} • {worker.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredWorkers.length === 0 && (
                    <p className="no-results">Nu s-au găsit lucrători.</p>
                  )}
                  {filteredWorkers.length > 10 && (
                    <p className="more-results">
                      ... și încă {filteredWorkers.length - 10} lucrători. Rafinează căutarea.
                    </p>
                  )}
                </div>
              </div>

              {selectedWorker && (
                <div className="selected-worker-info">
                  <h4>Lucrător selectat:</h4>
                  <div className="worker-summary">
                    <div className="worker-avatar large">
                      {selectedWorker.nume?.charAt(0)}{selectedWorker.prenume?.charAt(0)}
                    </div>
                    <div>
                      <p className="worker-name">{selectedWorker.nume} {selectedWorker.prenume}</p>
                      <p className="worker-meta">
                        Pașaport: {selectedWorker.pasaport_nr} | 
                        Cetățenie: {selectedWorker.cetatenie} |
                        Client: {selectedWorker.client_denumire || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="generate-section">
                <div className="format-selector">
                  <label>Format output:</label>
                  <div className="format-options">
                    <label className={`format-option ${outputFormat === 'docx' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="format"
                        value="docx"
                        checked={outputFormat === 'docx'}
                        onChange={(e) => setOutputFormat(e.target.value)}
                      />
                      <span>📘 Word (.docx)</span>
                    </label>
                    <label className={`format-option ${outputFormat === 'pdf' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="format"
                        value="pdf"
                        checked={outputFormat === 'pdf'}
                        onChange={(e) => setOutputFormat(e.target.value)}
                      />
                      <span>📕 PDF</span>
                    </label>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-generate"
                  onClick={handleGenerate}
                  disabled={!selectedType?.has_active_template || !selectedWorker || generating}
                >
                  {generating ? (
                    <>
                      <span className="spinner"></span>
                      Se generează...
                    </>
                  ) : (
                    <>
                      📥 Generează și Descarcă
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>👈 Selectează un tip de template din listă pentru a continua</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Upload Template */}
      {showUpload && selectedType && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📤 Încarcă Template: {selectedType.label}</h3>
              <button className="modal-close" onClick={() => setShowUpload(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Fișier Template (.docx) *</label>
                <input
                  type="file"
                  accept=".docx"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
                {uploadFile && (
                  <p className="file-selected">✔️ {uploadFile.name}</p>
                )}
              </div>
              <div className="form-group">
                <label>Descriere (opțional)</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Notă despre acest template..."
                  rows={3}
                />
              </div>
              <div className="upload-warning">
                ⚠️ Încărcarea unui nou template va dezactiva automat template-ul anterior pentru acest tip.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>
                Anulează
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
              >
                {uploading ? 'Se încarcă...' : 'Încarcă Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Istoric */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📜 Istoric Documente Generate</h3>
              <button className="modal-close" onClick={() => setShowHistory(false)}>×</button>
            </div>
            <div className="modal-body">
              {history.length > 0 ? (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Tip Document</th>
                      <th>Lucrător</th>
                      <th>Generat de</th>
                      <th>Format</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(item => (
                      <tr key={item.id}>
                        <td>{item.template_type_display}</td>
                        <td>{item.worker_name}</td>
                        <td>{item.generated_by_username}</td>
                        <td>
                          <span className={`format-badge ${item.output_format}`}>
                            {item.output_format === 'pdf' ? '📕 PDF' : '📘 Word'}
                          </span>
                        </td>
                        <td>{new Date(item.generated_at).toLocaleString('ro-RO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-history">Nu există documente generate în istoric.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Placeholder-uri */}
      {showPlaceholders && (
        <div className="modal-overlay" onClick={() => setShowPlaceholders(false)}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📖 Placeholder-uri Disponibile</h3>
              <button className="modal-close" onClick={() => setShowPlaceholders(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="placeholders-info">
                Folosește aceste placeholder-uri în fișierele .docx. 
                Placeholder-ele trebuie scrise între paranteze unghiulare: <code>&lt;nume_camp&gt;</code>
              </p>
              <div className="placeholders-grid">
                {Object.entries(placeholders).map(([category, items]) => (
                  <div key={category} className="placeholder-category">
                    <h4>{category.replace('_', ' ').toUpperCase()}</h4>
                    <table>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.key}>
                            <td className="placeholder-key"><code>&lt;{item.key}&gt;</code></td>
                            <td className="placeholder-desc">{item.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Acțiuni Document Generat */}
      {showDocActions && generatedDoc && (
        <div className="modal-overlay" onClick={handleCloseDocActions}>
          <div className="modal-content doc-actions-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header success-header">
              <h3>✅ Document Generat cu Succes!</h3>
              <button className="modal-close" onClick={handleCloseDocActions}>×</button>
            </div>
            <div className="modal-body">
              <div className="doc-info">
                <div className="doc-icon">📄</div>
                <div className="doc-details">
                  <p className="doc-title">{generatedDoc.templateLabel}</p>
                  <p className="doc-worker">Pentru: <strong>{generatedDoc.workerName}</strong></p>
                </div>
              </div>

              <div className="doc-actions-grid">
                <button 
                  className="doc-action-btn print-btn"
                  onClick={handlePrint}
                >
                  <span className="action-icon">🖨️</span>
                  <span className="action-label">Tipărește</span>
                  <span className="action-desc">Deschide pentru printare</span>
                </button>

                <button 
                  className="doc-action-btn download-word-btn"
                  onClick={() => handleDownload('docx')}
                >
                  <span className="action-icon">📘</span>
                  <span className="action-label">Descarcă Word</span>
                  <span className="action-desc">.docx - editabil</span>
                </button>

                <button 
                  className="doc-action-btn download-pdf-btn"
                  onClick={() => handleDownload('pdf')}
                >
                  <span className="action-icon">📕</span>
                  <span className="action-label">Descarcă PDF</span>
                  <span className="action-desc">.pdf - format fix</span>
                </button>
              </div>

              <div className="doc-preview-section">
                <p className="preview-label">Previzualizare PDF:</p>
                <iframe 
                  src={generatedDoc.urlPdf} 
                  className="doc-preview-iframe"
                  title="Previzualizare document"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseDocActions}>
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Templates
