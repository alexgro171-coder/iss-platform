import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { ecoFinAPI, clientsAPI } from '../services/api'
import './EcoFin.css'

/**
 * Pagina Eco-Fin - Evaluare Profitabilitate
 * Accesibil doar pentru Management și Admin
 */
function EcoFin() {
  const { isManagementOrAdmin, user } = useAuth()
  const [activeTab, setActiveTab] = useState('settings')
  
  // State pentru setări
  const [settings, setSettings] = useState([])
  const [settingsForm, setSettingsForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    cheltuieli_indirecte: '',
    cost_concediu: ''
  })
  const [editingSettings, setEditingSettings] = useState(null)
  
  // State pentru import
  const [importYear, setImportYear] = useState(new Date().getFullYear())
  const [importMonth, setImportMonth] = useState(new Date().getMonth()) // Luna anterioară
  const [importFile, setImportFile] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [importing, setImporting] = useState(false)
  
  // State pentru rapoarte
  const [reports, setReports] = useState([])
  const [reportSummary, setReportSummary] = useState(null)
  const [reportFilters, setReportFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
    client_id: ''
  })
  const [clients, setClients] = useState([])
  
  // Loading și error
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Luni și ani
  const months = [
    { value: 1, label: 'Ianuarie' }, { value: 2, label: 'Februarie' },
    { value: 3, label: 'Martie' }, { value: 4, label: 'Aprilie' },
    { value: 5, label: 'Mai' }, { value: 6, label: 'Iunie' },
    { value: 7, label: 'Iulie' }, { value: 8, label: 'August' },
    { value: 9, label: 'Septembrie' }, { value: 10, label: 'Octombrie' },
    { value: 11, label: 'Noiembrie' }, { value: 12, label: 'Decembrie' },
  ]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i)

  useEffect(() => {
    if (isManagementOrAdmin()) {
      loadInitialData()
    }
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [settingsData, clientsData] = await Promise.all([
        ecoFinAPI.getAllSettings(),
        clientsAPI.getAll()
      ])
      setSettings(settingsData)
      setClients(clientsData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // === HANDLERS SETĂRI ===
  const handleSettingsChange = (e) => {
    setSettingsForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    try {
      if (editingSettings) {
        await ecoFinAPI.updateSettings(editingSettings.id, settingsForm)
        setSuccess('Setările au fost actualizate.')
      } else {
        await ecoFinAPI.createSettings(settingsForm)
        setSuccess('Setările au fost create.')
      }
      setSettingsForm({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        cheltuieli_indirecte: '',
        cost_concediu: ''
      })
      setEditingSettings(null)
      loadInitialData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la salvarea setărilor.')
    }
  }

  const handleEditSettings = (setting) => {
    setEditingSettings(setting)
    setSettingsForm({
      year: setting.year,
      month: setting.month,
      cheltuieli_indirecte: setting.cheltuieli_indirecte,
      cost_concediu: setting.cost_concediu
    })
  }

  // === HANDLERS IMPORT ===
  const handleFileSelect = (e) => {
    setImportFile(e.target.files[0])
    setPreviewData(null)
    setError('')
  }

  const handleUploadPreview = async () => {
    if (!importFile) {
      setError('Selectează un fișier Excel.')
      return
    }
    
    setImporting(true)
    setError('')
    
    try {
      const data = await ecoFinAPI.uploadExcel(importFile, importYear, importMonth)
      setPreviewData(data)
      setSuccess(`Preview generat: ${data.valid_rows} rânduri valide din ${data.total_rows} total.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la procesarea fișierului.')
    } finally {
      setImporting(false)
    }
  }

  const handleValidateImport = async () => {
    if (!previewData) return
    
    setImporting(true)
    setError('')
    
    try {
      const result = await ecoFinAPI.validateImport(
        importYear, 
        importMonth, 
        previewData.preview.filter(r => r.is_valid)
      )
      setSuccess(result.message)
      setPreviewData(null)
      setImportFile(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la validarea importului.')
    } finally {
      setImporting(false)
    }
  }

  // === HANDLERS RAPOARTE ===
  const handleReportFilterChange = (e) => {
    setReportFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleLoadReports = async () => {
    setLoading(true)
    setError('')
    
    try {
      const [reportsData, summaryData] = await Promise.all([
        ecoFinAPI.getReports(reportFilters),
        ecoFinAPI.getReportSummary(reportFilters)
      ])
      setReports(reportsData)
      setReportSummary(summaryData)
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la încărcarea rapoartelor.')
    } finally {
      setLoading(false)
    }
  }

  // Format number
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return '-'
    return Number(num).toLocaleString('ro-RO', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    })
  }

  const formatCurrency = (num) => {
    if (num === null || num === undefined) return '-'
    return Number(num).toLocaleString('ro-RO', { 
      style: 'currency', 
      currency: 'RON',
      minimumFractionDigits: 2
    })
  }

  // Verificare acces
  if (!isManagementOrAdmin()) {
    return (
      <div className="ecofin-page">
        <div className="access-denied card">
          <span className="icon">🔒</span>
          <h2>Acces Restricționat</h2>
          <p>Modulul Eco-Fin este disponibil doar pentru Management și Admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ecofin-page">
      <header className="page-header">
        <div>
          <h1>💰 Eco-Fin - Profitabilitate</h1>
          <p>Evaluare profitabilitate lunară per lucrător</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="ecofin-tabs">
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Setări Globale
        </button>
        <button 
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📤 Import Date
        </button>
        <button 
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 Rapoarte
        </button>
      </div>

      {/* Messages */}
      {error && <div className="message error">{error}</div>}
      {success && <div className="message success">{success}</div>}

      {/* TAB: SETĂRI */}
      {activeTab === 'settings' && (
        <div className="tab-content">
          <div className="settings-grid">
            {/* Formular */}
            <div className="card settings-form">
              <h3>{editingSettings ? 'Editează Setări' : 'Adaugă Setări Lună'}</h3>
              <form onSubmit={handleSaveSettings}>
                <div className="form-row">
                  <div className="form-group">
                    <label>An</label>
                    <select name="year" value={settingsForm.year} onChange={handleSettingsChange}>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Lună</label>
                    <select name="month" value={settingsForm.month} onChange={handleSettingsChange}>
                      {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Cheltuieli Indirecte (RON/lună)</label>
                  <input
                    type="number"
                    name="cheltuieli_indirecte"
                    value={settingsForm.cheltuieli_indirecte}
                    onChange={handleSettingsChange}
                    placeholder="ex: 5000.00"
                    step="0.01"
                    required
                  />
                  <small>Se împart egal la toți lucrătorii din luna respectivă</small>
                </div>
                
                <div className="form-group">
                  <label>Cost Concediu (RON/lucrător)</label>
                  <input
                    type="number"
                    name="cost_concediu"
                    value={settingsForm.cost_concediu}
                    onChange={handleSettingsChange}
                    placeholder="ex: 200.00"
                    step="0.01"
                    required
                  />
                  <small>Cost fix per lucrător</small>
                </div>
                
                <div className="form-actions">
                  {editingSettings && (
                    <button type="button" className="btn btn-secondary" onClick={() => {
                      setEditingSettings(null)
                      setSettingsForm({
                        year: new Date().getFullYear(),
                        month: new Date().getMonth() + 1,
                        cheltuieli_indirecte: '',
                        cost_concediu: ''
                      })
                    }}>
                      Anulează
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary">
                    {editingSettings ? 'Salvează' : 'Adaugă'}
                  </button>
                </div>
              </form>
            </div>

            {/* Lista setări existente */}
            <div className="card settings-list">
              <h3>Setări Existente</h3>
              {settings.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Perioadă</th>
                      <th>Cheltuieli Ind.</th>
                      <th>Cost Concediu</th>
                      <th>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.map(s => (
                      <tr key={s.id}>
                        <td>{months.find(m => m.value === s.month)?.label} {s.year}</td>
                        <td className="number">{formatCurrency(s.cheltuieli_indirecte)}</td>
                        <td className="number">{formatCurrency(s.cost_concediu)}</td>
                        <td>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleEditSettings(s)}
                            title="Editează"
                          >
                            ✏️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-message">Nu există setări configurate.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: IMPORT */}
      {activeTab === 'import' && (
        <div className="tab-content">
          <div className="card import-section">
            <h3>📤 Import Date Lunare</h3>
            <p className="import-info">
              Încarcă fișierul Excel cu datele lunare. Coloanele necesare: 
              <strong> Passport</strong> (nr. pașaport), 
              <strong> Hours</strong> (ore lucrate), 
              <strong> Salary</strong> (cost salarial).
            </p>
            
            <div className="import-form">
              <div className="form-row">
                <div className="form-group">
                  <label>An</label>
                  <select value={importYear} onChange={(e) => setImportYear(Number(e.target.value))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Lună</label>
                  <select value={importMonth} onChange={(e) => setImportMonth(Number(e.target.value))}>
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="form-group file-input">
                  <label>Fișier Excel</label>
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} />
                </div>
                <div className="form-group">
                  <label>&nbsp;</label>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleUploadPreview}
                    disabled={!importFile || importing}
                  >
                    {importing ? 'Se procesează...' : '📋 Generează Preview'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          {previewData && (
            <div className="card preview-section">
              <div className="preview-header">
                <h3>Preview Import - {months.find(m => m.value === importMonth)?.label} {importYear}</h3>
                <div className="preview-stats">
                  <span className="stat valid">✓ {previewData.valid_rows} valide</span>
                  <span className="stat invalid">✗ {previewData.invalid_rows} invalide</span>
                </div>
              </div>
              
              <div className="preview-settings">
                <span>Cheltuieli indirecte/lucrător: <strong>{formatCurrency(previewData.settings.cheltuieli_per_worker)}</strong></span>
                <span>Cost concediu: <strong>{formatCurrency(previewData.settings.cost_concediu)}</strong></span>
              </div>

              <div className="table-container">
                <table className="data-table preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Pașaport</th>
                      <th>Nume</th>
                      <th>Client</th>
                      <th>Ore</th>
                      <th>Salariu</th>
                      <th>Tarif/h</th>
                      <th>Profit Est.</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview.map((row, idx) => (
                      <tr key={idx} className={row.is_valid ? '' : 'invalid-row'}>
                        <td>{row.row_number}</td>
                        <td className="mono">{row.pasaport_nr}</td>
                        <td>{row.worker_nume} {row.worker_prenume}</td>
                        <td>{row.client_denumire || '-'}</td>
                        <td className="number">{formatNumber(row.hours_worked, 1)}</td>
                        <td className="number">{formatCurrency(row.salary_cost)}</td>
                        <td className="number">{formatCurrency(row.tarif_orar)}</td>
                        <td className={`number ${row.profit_brut_estimat >= 0 ? 'profit' : 'loss'}`}>
                          {formatCurrency(row.profit_brut_estimat)}
                        </td>
                        <td>
                          {row.is_valid ? (
                            <span className="badge badge-success">✓ Valid</span>
                          ) : (
                            <span className="badge badge-danger" title={row.errors.join(', ')}>
                              ✗ {row.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="preview-actions">
                <button className="btn btn-secondary" onClick={() => setPreviewData(null)}>
                  Anulează
                </button>
                <button 
                  className="btn btn-success" 
                  onClick={handleValidateImport}
                  disabled={importing || previewData.valid_rows === 0}
                >
                  ✓ Validează și Salvează ({previewData.valid_rows} înregistrări)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: RAPOARTE */}
      {activeTab === 'reports' && (
        <div className="tab-content">
          {/* Filtre */}
          <div className="card filters-section">
            <h3>🔍 Filtre Raport</h3>
            <div className="form-row">
              <div className="form-group">
                <label>An</label>
                <select name="year" value={reportFilters.year} onChange={handleReportFilterChange}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Lună</label>
                <select name="month" value={reportFilters.month} onChange={handleReportFilterChange}>
                  <option value="">Toate lunile</option>
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Client</label>
                <select name="client_id" value={reportFilters.client_id} onChange={handleReportFilterChange}>
                  <option value="">Toți clienții</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.denumire}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>&nbsp;</label>
                <button className="btn btn-primary" onClick={handleLoadReports} disabled={loading}>
                  {loading ? 'Se încarcă...' : '📊 Generează Raport'}
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          {reportSummary && (
            <div className="summary-grid">
              <div className="summary-card total">
                <span className="label">Total Lucrători</span>
                <span className="value">{reportSummary.total_workers}</span>
              </div>
              <div className="summary-card">
                <span className="label">Total Ore</span>
                <span className="value">{formatNumber(reportSummary.total_hours, 1)}</span>
              </div>
              <div className="summary-card">
                <span className="label">Venituri Totale</span>
                <span className="value">{formatCurrency(reportSummary.total_revenue)}</span>
              </div>
              <div className="summary-card">
                <span className="label">Costuri Totale</span>
                <span className="value">{formatCurrency(reportSummary.total_costs)}</span>
              </div>
              <div className={`summary-card ${reportSummary.total_profit >= 0 ? 'profit' : 'loss'}`}>
                <span className="label">Profit Total</span>
                <span className="value">{formatCurrency(reportSummary.total_profit)}</span>
              </div>
              <div className="summary-card">
                <span className="label">Profit Mediu/Lucrător</span>
                <span className="value">{formatCurrency(reportSummary.average_profit_per_worker)}</span>
              </div>
            </div>
          )}

          {/* Tabel Rapoarte */}
          {reports.length > 0 && (
            <div className="card">
              <h3>Detalii per Lucrător ({reports.length} înregistrări)</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Lucrător</th>
                      <th>Client</th>
                      <th>Perioadă</th>
                      <th>Ore</th>
                      <th>Salariu</th>
                      <th>Alte Costuri</th>
                      <th>Venit</th>
                      <th>Profit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => {
                      const venit = Number(r.hours_worked) * Number(r.tarif_orar)
                      const alteCosturi = Number(r.cost_cazare) + Number(r.cost_masa) + 
                                         Number(r.cost_transport) + Number(r.cost_concediu) + 
                                         Number(r.cheltuieli_indirecte)
                      return (
                        <tr key={r.id}>
                          <td>{r.worker_nume} {r.worker_prenume}</td>
                          <td>{r.client_denumire}</td>
                          <td>{months.find(m => m.value === r.month)?.label?.slice(0,3)} {r.year}</td>
                          <td className="number">{formatNumber(r.hours_worked, 1)}</td>
                          <td className="number">{formatCurrency(r.salary_cost)}</td>
                          <td className="number">{formatCurrency(alteCosturi)}</td>
                          <td className="number">{formatCurrency(venit)}</td>
                          <td className={`number ${Number(r.profit_brut) >= 0 ? 'profit' : 'loss'}`}>
                            {formatCurrency(r.profit_brut)}
                          </td>
                          <td>
                            {r.is_validated ? (
                              <span className="badge badge-success">✓ Validat</span>
                            ) : (
                              <span className="badge badge-warning">Draft</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reports.length === 0 && reportSummary === null && (
            <div className="empty-state card">
              <p>Selectează filtrele și apasă "Generează Raport" pentru a vedea datele.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default EcoFin

