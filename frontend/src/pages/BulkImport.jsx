import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import './BulkImport.css'

/**
 * Pagina Import Bulk - încărcare masivă lucrători din Excel
 * Disponibil doar pentru Management/Admin
 */
function BulkImport() {
  const { isManagementOrAdmin } = useAuth()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Descarcă template
  const handleDownloadTemplate = async () => {
    setDownloading(true)
    setError('')
    try {
      const response = await api.get('/workers/bulk-template/', {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_import_lucratori.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download template error:', error)
      setError(error.response?.data?.detail || error.message || 'Eroare la descărcarea template-ului')
    } finally {
      setDownloading(false)
    }
  }

  // Selectează fișier
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Te rog selectează un fișier Excel (.xlsx sau .xls)')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError('')
      setResults(null)
    }
  }

  // Upload și import
  const handleImport = async () => {
    if (!file) {
      setError('Te rog selectează un fișier')
      return
    }

    setUploading(true)
    setError('')
    setResults(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/workers/bulk-import/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setResults(response.data)
      setFile(null)
      // Reset input
      document.getElementById('file-input').value = ''
    } catch (error) {
      console.error('Import error:', error)
      setError(error.response?.data?.detail || error.message || 'Eroare la import')
    } finally {
      setUploading(false)
    }
  }

  // Verifică permisiunile
  if (!isManagementOrAdmin()) {
    return (
      <div className="bulk-import-page">
        <div className="access-denied card">
          <span className="icon">🔒</span>
          <h2>Acces Restricționat</h2>
          <p>Această pagină este disponibilă doar pentru Management și Admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bulk-import-page">
      <header className="page-header">
        <div>
          <h1>📥 Import Bulk Lucrători</h1>
          <p>Încarcă mai mulți lucrători simultan din fișier Excel</p>
        </div>
      </header>

      {/* Instrucțiuni */}
      <div className="instructions-card card">
        <h3>📋 Cum funcționează?</h3>
        <ol>
          <li>
            <strong>Descarcă template-ul Excel</strong> - conține toate coloanele în ordinea corectă
          </li>
          <li>
            <strong>Completează datele</strong> - câmpurile obligatorii sunt: Nume, Prenume, Nr. Pașaport
          </li>
          <li>
            <strong>Încarcă fișierul</strong> - sistemul va valida și importa automat
          </li>
          <li>
            <strong>Verifică rezultatele</strong> - vei vedea raportul cu succes/erori
          </li>
        </ol>
        
        <div className="template-download">
          <button 
            className="btn btn-primary" 
            onClick={handleDownloadTemplate}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <span className="spinner"></span>
                Se descarcă...
              </>
            ) : (
              '📄 Descarcă Template Excel'
            )}
          </button>
        </div>
      </div>

      {/* Upload Area */}
      <div className="upload-card card">
        <h3>📤 Încarcă fișierul Excel</h3>
        
        <div className="upload-area">
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="file-input"
          />
          <label htmlFor="file-input" className="file-label">
            {file ? (
              <>
                <span className="file-icon">📊</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
              </>
            ) : (
              <>
                <span className="upload-icon">📁</span>
                <span>Click pentru a selecta un fișier Excel</span>
                <span className="upload-hint">sau trage și plasează aici</span>
              </>
            )}
          </label>
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <div className="upload-actions">
          <button 
            className="btn btn-primary btn-large"
            onClick={handleImport}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <span className="spinner"></span>
                Se procesează...
              </>
            ) : (
              <>
                🚀 Importă Lucrători
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rezultate */}
      {results && (
        <div className="results-card card">
          <h3>📊 Rezultate Import</h3>
          
          <div className="results-summary">
            <div className="result-stat total">
              <span className="stat-value">{results.total}</span>
              <span className="stat-label">Total rânduri</span>
            </div>
            <div className="result-stat success">
              <span className="stat-value">{results.success}</span>
              <span className="stat-label">Importați cu succes</span>
            </div>
            <div className="result-stat errors">
              <span className="stat-value">{results.errors}</span>
              <span className="stat-label">Erori</span>
            </div>
          </div>

          {results.details && results.details.length > 0 && (
            <div className="results-details">
              <h4>Detalii pe rânduri:</h4>
              <div className="details-table-container">
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>Rând</th>
                      <th>Status</th>
                      <th>Mesaj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.details.map((detail, index) => (
                      <tr key={index} className={`row-${detail.status}`}>
                        <td>{detail.row}</td>
                        <td>
                          <span className={`status-badge ${detail.status}`}>
                            {detail.status === 'success' ? '✅' : '❌'}
                          </span>
                        </td>
                        <td>{detail.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results.success > 0 && (
            <div className="success-message">
              ✅ {results.success} lucrători au fost importați cu succes!
              <a href="/workers" className="btn btn-secondary mt-2">
                Vezi lista lucrătorilor
              </a>
            </div>
          )}

          {/* Avertizare pentru coduri COR noi */}
          {results.new_cor_codes && results.new_cor_codes.length > 0 && (
            <div className="warning-message new-cor-warning">
              <div className="warning-header">
                <span className="warning-icon">⚠️</span>
                <strong>Atenție: Coduri COR noi adăugate!</strong>
              </div>
              <p>
                Următoarele coduri COR au fost adăugate automat în nomenclator, dar necesită 
                completarea denumirilor în română și engleză:
              </p>
              <div className="new-cor-codes-list">
                {results.new_cor_codes.map((code, index) => (
                  <span key={index} className="cor-code-badge">{code}</span>
                ))}
              </div>
              <div className="warning-actions">
                <a href="/coduri-cor" className="btn btn-warning">
                  📝 Completează Codurile COR
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Câmpuri disponibile */}
      <div className="fields-card card">
        <h3>📝 Câmpuri disponibile în template</h3>
        <div className="fields-grid">
          <div className="field-group">
            <h4>🔴 Obligatorii</h4>
            <ul>
              <li><code>nume</code> - Numele de familie</li>
              <li><code>prenume</code> - Prenumele</li>
              <li><code>pasaport_nr</code> - Nr. pașaport (unic)</li>
            </ul>
          </div>
          
          <div className="field-group">
            <h4>👤 Date personale</h4>
            <ul>
              <li><code>cetatenie</code> - Țara de origine</li>
              <li><code>stare_civila</code> - M/NM</li>
              <li><code>copii_intretinere</code> - Număr</li>
              <li><code>sex</code> - M/F</li>
              <li><code>data_nasterii</code></li>
              <li><code>oras_domiciliu</code></li>
            </ul>
          </div>
          
          <div className="field-group">
            <h4>📄 Pașaport</h4>
            <ul>
              <li><code>data_emitere_pass</code></li>
              <li><code>data_exp_pass</code></li>
            </ul>
          </div>
          
          <div className="field-group">
            <h4>📋 Work Permit</h4>
            <ul>
              <li><code>dosar_wp_nr</code></li>
              <li><code>data_solicitare_wp</code></li>
              <li><code>data_programare_wp</code></li>
              <li><code>judet_wp</code></li>
              <li><code>cod_cor</code></li>
            </ul>
          </div>
          
          <div className="field-group">
            <h4>🛂 Viză</h4>
            <ul>
              <li><code>data_solicitare_viza</code></li>
              <li><code>data_programare_interviu</code></li>
              <li><code>status</code></li>
            </ul>
          </div>
          
          <div className="field-group">
            <h4>🏠 În România</h4>
            <ul>
              <li><code>cnp</code></li>
              <li><code>data_intrare_ro</code></li>
              <li><code>cim_nr</code></li>
              <li><code>data_emitere_cim</code></li>
              <li><code>data_depunere_ps</code></li>
              <li><code>data_emitere_ps</code></li>
              <li><code>data_expirare_ps</code></li>
              <li><code>adresa_ro</code></li>
              <li><code>client_denumire</code></li>
              <li><code>observatii</code></li>
            </ul>
          </div>
        </div>
        
        <div className="date-format-note">
          ℹ️ <strong>Format date:</strong> YYYY-MM-DD (ex: 2024-03-15)
        </div>
      </div>
    </div>
  )
}

export default BulkImport

