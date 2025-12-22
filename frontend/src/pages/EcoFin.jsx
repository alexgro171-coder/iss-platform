import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { ecoFinAPI, clientsAPI } from '../services/api'
import EcoFinBilling from './EcoFinBilling'
import './EcoFin.css'

/**
 * Pagina Eco-Fin - Evaluare Profitabilitate
 * Accesibil doar pentru Management și Admin
 * 
 * Funcționalități:
 * - Setări globale lunare (cheltuieli indirecte, cost concediu)
 * - Import date salariale din Excel (identificare după nr_CIM)
 * - Calcul automat profitabilitate: (ore × tarif) - costuri totale
 * - Validare managerială
 * - Rapoarte cu grafic PIE
 * - Export PDF/Word
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
  const [importMonth, setImportMonth] = useState(new Date().getMonth() || 12) // Luna anterioară
  const [importFile, setImportFile] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [importing, setImporting] = useState(false)
  
  // State pentru rapoarte
  const [records, setRecords] = useState([])
  const [reportSummary, setReportSummary] = useState(null)
  const [chartData, setChartData] = useState([])
  const [reportFilters, setReportFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
    client_id: ''
  })
  const [clients, setClients] = useState([])
  const [validating, setValidating] = useState(false)
  
  // State pentru rapoarte financiare (rest plată, rețineri)
  const [financialData, setFinancialData] = useState(null)
  const [restPlataData, setRestPlataData] = useState(null)
  const [restPlataChartData, setRestPlataChartData] = useState([])
  const [financialFilters, setFinancialFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
    client_id: ''
  })
  
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

  // Culori pentru graficul PIE
  const CHART_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#22c55e', '#eab308', '#0ea5e9'
  ]

  useEffect(() => {
    if (isManagementOrAdmin()) {
      loadInitialData()
    }
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    setError('')
    try {
      const [settingsData, clientsData] = await Promise.all([
        ecoFinAPI.getAllSettings().catch(() => []),
        clientsAPI.getAll().catch(() => [])
      ])
      setSettings(settingsData || [])
      setClients(clientsData || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Eroare la încărcarea datelor. Verificați conexiunea.')
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

  const handleDownloadTemplate = async () => {
    setError('')
    try {
      const blob = await ecoFinAPI.downloadTemplate()
      if (!blob) {
        throw new Error('Nu s-a putut descărca template-ul')
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_import_ecofin.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download template error:', err)
      setError('Eroare la descărcarea template-ului. Verificați autentificarea.')
    }
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
      setSuccess(`Preview generat: ${data.matched_rows} rânduri identificate din ${data.total_rows} total.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la procesarea fișierului.')
    } finally {
      setImporting(false)
    }
  }

  const handleProcessImport = async () => {
    if (!previewData) return
    
    setImporting(true)
    setError('')
    
    try {
      const result = await ecoFinAPI.processImport(
        previewData.batch_id,
        importYear, 
        importMonth, 
        previewData.preview.filter(r => r.is_valid)
      )
      setSuccess(result.message)
      setPreviewData(null)
      setImportFile(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la procesarea importului.')
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
      // Folosim noile API-uri
      const [recordsData, summaryData] = await Promise.all([
        ecoFinAPI.getRecords(reportFilters).catch(() => []),
        ecoFinAPI.getRecordsSummary(reportFilters).catch(() => null)
      ])
      setRecords(recordsData || [])
      setReportSummary(summaryData || null)
      
      // Pregătim datele pentru graficul PIE
      if (summaryData?.by_client && summaryData.by_client.length > 0) {
        const pieData = summaryData.by_client
          .filter(c => c.total_profit > 0)
          .map((c, idx) => ({
            name: c.client__denumire,
            value: parseFloat(c.total_profit),
            percent: c.profit_share_percent,
            color: CHART_COLORS[idx % CHART_COLORS.length]
          }))
        setChartData(pieData)
      } else {
        setChartData([])
      }
    } catch (err) {
      console.error('Reports error:', err)
      setError(err?.response?.data?.detail || 'Eroare la încărcarea rapoartelor.')
    } finally {
      setLoading(false)
    }
  }

  const handleValidateMonth = async () => {
    if (!reportFilters.year || !reportFilters.month) {
      setError('Selectează anul și luna pentru validare.')
      return
    }
    
    setValidating(true)
    setError('')
    
    try {
      const result = await ecoFinAPI.validateMonth(
        parseInt(reportFilters.year),
        parseInt(reportFilters.month)
      )
      setSuccess(result.message)
      handleLoadReports()
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la validarea datelor.')
    } finally {
      setValidating(false)
    }
  }

  // === HANDLERS EXPORT ===
  const handleExportPDF = async () => {
    try {
      const blob = await ecoFinAPI.exportPDF(reportFilters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const period = reportFilters.month 
        ? `${reportFilters.month}_${reportFilters.year}` 
        : reportFilters.year
      a.download = `raport_ecofin_${period}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Eroare la exportul PDF.')
    }
  }

  const handleExportWord = async () => {
    try {
      const blob = await ecoFinAPI.exportWord(reportFilters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const period = reportFilters.month 
        ? `${reportFilters.month}_${reportFilters.year}` 
        : reportFilters.year
      a.download = `raport_ecofin_${period}.docx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Eroare la exportul Word.')
    }
  }

  // === HANDLERS RAPOARTE FINANCIARE ===
  const handleFinancialFilterChange = (e) => {
    setFinancialFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleLoadFinancialReports = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Încarcă date în paralel
      const [summaryData, restPlataClientData] = await Promise.all([
        ecoFinAPI.getFinancialSummary(financialFilters).catch(() => null),
        ecoFinAPI.getReportRestPlataByClient(financialFilters).catch(() => null)
      ])
      
      setFinancialData(summaryData || null)
      setRestPlataData(restPlataClientData || null)
      
      // Pregătim datele pentru graficul PIE rest plată
      if (restPlataClientData?.chart_data && restPlataClientData.chart_data.length > 0) {
        const pieData = restPlataClientData.chart_data.map((c, idx) => ({
          name: c.name,
          value: c.value,
          percent: c.percent,
          color: CHART_COLORS[idx % CHART_COLORS.length]
        }))
        setRestPlataChartData(pieData)
      } else {
        setRestPlataChartData([])
      }
    } catch (err) {
      console.error('Financial reports error:', err)
      setError(err?.response?.data?.detail || 'Eroare la încărcarea rapoartelor financiare.')
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

  // Calculează totalul pentru graficul PIE
  const totalProfit = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0)
  }, [chartData])

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
          <p>Evaluare profitabilitate lunară per lucrător și client</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="ecofin-tabs">
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Setări Lunare
        </button>
        <button 
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📤 Import Salarii
        </button>
        <button 
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 Rapoarte
        </button>
        <button 
          className={`tab ${activeTab === 'financial' ? 'active' : ''}`}
          onClick={() => setActiveTab('financial')}
        >
          💵 Financiar
        </button>
        <div className="tab-separator"></div>
        <button 
          className={`tab ${activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          🧾 Facturare
        </button>
        <button 
          className={`tab ${activeTab === 'billing-reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing-reports')}
        >
          📑 Rapoarte Facturare
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
                  <label>Cheltuieli Indirecte Totale (RON/lună)</label>
                  <input
                    type="number"
                    name="cheltuieli_indirecte"
                    value={settingsForm.cheltuieli_indirecte}
                    onChange={handleSettingsChange}
                    placeholder="ex: 50000.00"
                    step="0.01"
                    required
                  />
                  <small>Se împart egal la toți lucrătorii activi din luna respectivă</small>
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
                      <th>Status</th>
                      <th>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.map(s => (
                      <tr key={s.id} className={s.is_locked ? 'locked-row' : ''}>
                        <td>{months.find(m => m.value === s.month)?.label} {s.year}</td>
                        <td className="number">{formatCurrency(s.cheltuieli_indirecte)}</td>
                        <td className="number">{formatCurrency(s.cost_concediu)}</td>
                        <td>
                          {s.is_locked ? (
                            <span className="badge badge-success">🔒 Validat</span>
                          ) : (
                            <span className="badge badge-warning">📝 Draft</span>
                          )}
                        </td>
                        <td>
                          {!s.is_locked && (
                            <button 
                              className="btn-icon" 
                              onClick={() => handleEditSettings(s)}
                              title="Editează"
                            >
                              ✏️
                            </button>
                          )}
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
            <h3>📤 Import Date Salariale Lunare</h3>
            <div className="import-info">
              <p>
                Încarcă fișierul Excel cu datele salariale. 
                <strong> Coloane necesare:</strong>
              </p>
              <ul className="columns-list">
                <li><code>nr_cim</code> - Număr CIM (obligatoriu, pentru identificare)</li>
                <li><code>nume</code>, <code>prenume</code> - pentru verificare</li>
                <li><code>salariu</code> / <code>brut</code> - Salariu brut (obligatoriu)</li>
                <li><code>ore</code> / <code>lucrat</code> - Ore lucrate (obligatoriu)</li>
                <li><code>cam</code> - Contribuție asigurări muncă (obligatoriu)</li>
                <li><code>net</code>, <code>retineri</code>, <code>rest_plata</code> - opționale</li>
              </ul>
              <button className="btn btn-sm btn-secondary" onClick={handleDownloadTemplate}>
                📥 Descarcă Template Excel
              </button>
            </div>
            
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
              </div>
              
              <div className="form-row file-row">
                <div className="form-group file-input-group">
                  <label>📁 Selectează Fișier Excel pentru Import</label>
                  <input 
                    type="file" 
                    accept=".xlsx,.xls" 
                    onChange={handleFileSelect}
                    className="file-input-field"
                  />
                  {importFile && (
                    <span className="file-selected">✓ {importFile.name}</span>
                  )}
                </div>
              </div>
              
              <div className="form-row">
                <button 
                  className="btn btn-primary btn-upload" 
                  onClick={handleUploadPreview}
                  disabled={!importFile || importing}
                >
                  {importing ? '⏳ Se procesează...' : '📋 Generează Preview'}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          {previewData && (
            <div className="card preview-section">
              <div className="preview-header">
                <h3>Preview Import - {months.find(m => m.value === importMonth)?.label} {importYear}</h3>
                <div className="preview-stats">
                  <span className="stat valid">✓ {previewData.matched_rows} identificate</span>
                  <span className="stat invalid">✗ {previewData.error_rows} erori</span>
                </div>
              </div>
              
              <div className="preview-settings">
                <span>Cheltuieli indirecte/lucrător: <strong>{formatCurrency(previewData.settings?.cota_indirecte_per_worker)}</strong></span>
                <span>Cost concediu: <strong>{formatCurrency(previewData.settings?.cost_concediu)}</strong></span>
              </div>

              <div className="table-container">
                <table className="data-table preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nr. CIM</th>
                      <th>Nume Excel</th>
                      <th>Lucrător Găsit</th>
                      <th>Client</th>
                      <th>Ore</th>
                      <th>Brut</th>
                      <th>CAM</th>
                      <th>Tarif/h</th>
                      <th>Profit Est.</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview.map((row, idx) => (
                      <tr key={idx} className={row.is_valid ? '' : 'invalid-row'}>
                        <td>{row.row_number}</td>
                        <td className="mono">{row.nr_cim}</td>
                        <td>{row.nume} {row.prenume}</td>
                        <td>
                          {row.is_matched ? (
                            <span className={row.worker_nume_match ? 'match-ok' : 'match-warning'}>
                              {row.worker_nume} {row.worker_prenume}
                              {!row.worker_nume_match && ' ⚠️'}
                            </span>
                          ) : '-'}
                        </td>
                        <td>{row.client_denumire || '-'}</td>
                        <td className="number">{formatNumber(row.ore_lucrate, 1)}</td>
                        <td className="number">{formatCurrency(row.salariu_brut)}</td>
                        <td className="number">{formatCurrency(row.cam)}</td>
                        <td className="number">{formatCurrency(row.tarif_orar)}</td>
                        <td className={`number ${row.profitabilitate_estimata >= 0 ? 'profit' : 'loss'}`}>
                          {formatCurrency(row.profitabilitate_estimata)}
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

              {/* Warnings */}
              {previewData.preview.some(r => r.warnings?.length > 0) && (
                <div className="warnings-section">
                  <h4>⚠️ Avertismente</h4>
                  <ul>
                    {previewData.preview
                      .filter(r => r.warnings?.length > 0)
                      .flatMap(r => r.warnings.map((w, i) => (
                        <li key={`${r.row_number}-${i}`}>Rând {r.row_number}: {w}</li>
                      )))
                    }
                  </ul>
                </div>
              )}

              <div className="preview-actions">
                <button className="btn btn-secondary" onClick={() => setPreviewData(null)}>
                  Anulează
                </button>
                <button 
                  className="btn btn-success" 
                  onClick={handleProcessImport}
                  disabled={importing || previewData.matched_rows === 0}
                >
                  ✓ Procesează și Salvează ({previewData.matched_rows} înregistrări)
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
              <div className="form-group btn-group-vertical">
                <label>&nbsp;</label>
                <button className="btn btn-primary" onClick={handleLoadReports} disabled={loading}>
                  {loading ? 'Se încarcă...' : '📊 Generează Raport'}
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
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
                <span className="value">{formatCurrency(reportSummary.total_venit)}</span>
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
                <span className="label">Marjă Profit</span>
                <span className="value">{formatNumber(reportSummary.profit_margin_percent, 1)}%</span>
              </div>
            </div>
          )}

          {/* Grafic PIE */}
          {chartData.length > 0 && (
            <div className="card chart-section">
              <h3>📈 Distribuție Profit pe Clienți</h3>
              <div className="pie-chart-container">
                <div className="pie-chart">
                  <svg viewBox="0 0 100 100">
                    {(() => {
                      let cumulativePercent = 0
                      return chartData.map((item, idx) => {
                        const percent = item.percent / 100
                        const startAngle = cumulativePercent * 2 * Math.PI
                        cumulativePercent += percent
                        const endAngle = cumulativePercent * 2 * Math.PI
                        
                        const x1 = 50 + 40 * Math.cos(startAngle - Math.PI / 2)
                        const y1 = 50 + 40 * Math.sin(startAngle - Math.PI / 2)
                        const x2 = 50 + 40 * Math.cos(endAngle - Math.PI / 2)
                        const y2 = 50 + 40 * Math.sin(endAngle - Math.PI / 2)
                        
                        const largeArcFlag = percent > 0.5 ? 1 : 0
                        
                        const pathData = [
                          `M 50 50`,
                          `L ${x1} ${y1}`,
                          `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                          `Z`
                        ].join(' ')
                        
                        return (
                          <path
                            key={idx}
                            d={pathData}
                            fill={item.color}
                            stroke="#1e293b"
                            strokeWidth="0.5"
                          >
                            <title>{item.name}: {formatCurrency(item.value)} ({formatNumber(item.percent, 1)}%)</title>
                          </path>
                        )
                      })
                    })()}
                  </svg>
                </div>
                <div className="chart-legend">
                  {chartData.map((item, idx) => (
                    <div key={idx} className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                      <span className="legend-label">{item.name}</span>
                      <span className="legend-value">{formatCurrency(item.value)}</span>
                      <span className="legend-percent">({formatNumber(item.percent, 1)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabel Detalii */}
          {records.length > 0 && (
            <div className="card">
              <div className="card-header-actions">
                <h3>Detalii per Lucrător ({records.length} înregistrări)</h3>
                <div className="export-buttons">
                  <button className="btn btn-sm btn-secondary" onClick={handleExportPDF}>
                    📄 Export PDF
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={handleExportWord}>
                    📝 Export Word
                  </button>
                  {reportFilters.month && (
                    <button 
                      className="btn btn-sm btn-success" 
                      onClick={handleValidateMonth}
                      disabled={validating || records.every(r => r.is_validated)}
                    >
                      {validating ? 'Se validează...' : '✓ Validează Luna'}
                    </button>
                  )}
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Lucrător</th>
                      <th>Nr. CIM</th>
                      <th>Client</th>
                      <th>Perioadă</th>
                      <th>Ore</th>
                      <th>Cost Salarial</th>
                      <th>Alte Costuri</th>
                      <th>Venit</th>
                      <th>Profit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => {
                      const alteCosturi = Number(r.cost_cazare) + Number(r.cost_masa) + 
                                         Number(r.cost_transport) + Number(r.cost_concediu) + 
                                         Number(r.cota_indirecte)
                      return (
                        <tr key={r.id}>
                          <td>{r.worker_nume} {r.worker_prenume}</td>
                          <td className="mono">{r.nr_cim}</td>
                          <td>{r.client_denumire}</td>
                          <td>{months.find(m => m.value === r.month)?.label?.slice(0,3)} {r.year}</td>
                          <td className="number">{formatNumber(r.ore_lucrate, 1)}</td>
                          <td className="number">{formatCurrency(r.cost_salarial_complet)}</td>
                          <td className="number">{formatCurrency(alteCosturi)}</td>
                          <td className="number">{formatCurrency(r.venit_generat)}</td>
                          <td className={`number ${Number(r.profitabilitate) >= 0 ? 'profit' : 'loss'}`}>
                            {formatCurrency(r.profitabilitate)}
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

          {records.length === 0 && reportSummary === null && (
            <div className="empty-state card">
              <p>Selectează filtrele și apasă "Generează Raport" pentru a vedea datele.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: FINANCIAR */}
      {activeTab === 'financial' && (
        <div className="tab-content">
          {/* Filtre */}
          <div className="card filters-section">
            <h3>🔍 Filtre Raport Financiar</h3>
            <div className="form-row">
              <div className="form-group">
                <label>An</label>
                <select name="year" value={financialFilters.year} onChange={handleFinancialFilterChange}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Lună</label>
                <select name="month" value={financialFilters.month} onChange={handleFinancialFilterChange}>
                  <option value="">Toate lunile</option>
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Client</label>
                <select name="client_id" value={financialFilters.client_id} onChange={handleFinancialFilterChange}>
                  <option value="">Toți clienții</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.denumire}</option>)}
                </select>
              </div>
              <div className="form-group btn-group-vertical">
                <label>&nbsp;</label>
                <button className="btn btn-primary" onClick={handleLoadFinancialReports} disabled={loading}>
                  {loading ? 'Se încarcă...' : '💵 Generează Raport'}
                </button>
              </div>
            </div>
          </div>

          {/* Sumar Financiar */}
          {financialData && (
            <>
              <div className="summary-grid financial-summary">
                <div className="summary-card total">
                  <span className="label">Total Lucrători</span>
                  <span className="value">{financialData.summary.total_workers}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Salariu Brut Total</span>
                  <span className="value">{formatCurrency(financialData.summary.salarii.brut)}</span>
                </div>
                <div className="summary-card">
                  <span className="label">CAM Total</span>
                  <span className="value">{formatCurrency(financialData.summary.salarii.cam)}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Salariu Net Total</span>
                  <span className="value">{formatCurrency(financialData.summary.salarii.net)}</span>
                </div>
                <div className="summary-card warning">
                  <span className="label">Total Rețineri</span>
                  <span className="value">{formatCurrency(financialData.summary.salarii.retineri)}</span>
                  <span className="sub-value">{formatNumber(financialData.summary.salarii.retineri_percent, 1)}% din brut</span>
                </div>
                <div className="summary-card highlight">
                  <span className="label">💵 Rest de Plată Total</span>
                  <span className="value">{formatCurrency(financialData.summary.salarii.rest_plata)}</span>
                </div>
              </div>

              {/* Alte Costuri */}
              <div className="card costs-breakdown">
                <h3>📊 Defalcare Costuri</h3>
                <div className="costs-grid">
                  <div className="cost-item">
                    <span className="cost-label">Cost Salarial Complet</span>
                    <span className="cost-value">{formatCurrency(financialData.summary.salarii.cost_salarial_complet)}</span>
                    <span className="cost-detail">(Brut + CAM)</span>
                  </div>
                  <div className="cost-item">
                    <span className="cost-label">Cazare</span>
                    <span className="cost-value">{formatCurrency(financialData.summary.alte_costuri.cazare)}</span>
                  </div>
                  <div className="cost-item">
                    <span className="cost-label">Masă</span>
                    <span className="cost-value">{formatCurrency(financialData.summary.alte_costuri.masa)}</span>
                  </div>
                  <div className="cost-item">
                    <span className="cost-label">Transport</span>
                    <span className="cost-value">{formatCurrency(financialData.summary.alte_costuri.transport)}</span>
                  </div>
                  <div className="cost-item">
                    <span className="cost-label">Cheltuieli Indirecte</span>
                    <span className="cost-value">{formatCurrency(financialData.summary.alte_costuri.indirecte)}</span>
                  </div>
                  <div className="cost-item">
                    <span className="cost-label">Cost Concediu</span>
                    <span className="cost-value">{formatCurrency(financialData.summary.alte_costuri.concediu)}</span>
                  </div>
                  <div className="cost-item total">
                    <span className="cost-label">TOTAL COSTURI</span>
                    <span className="cost-value">{formatCurrency(financialData.summary.total_costuri)}</span>
                  </div>
                </div>
              </div>

              {/* Ratii */}
              <div className="card ratios-section">
                <h3>📈 Indicatori Financiari</h3>
                <div className="ratios-grid">
                  <div className="ratio-item">
                    <span className="ratio-value">{formatCurrency(financialData.summary.ratii.cost_per_ora)}</span>
                    <span className="ratio-label">Cost per Oră</span>
                  </div>
                  <div className="ratio-item">
                    <span className="ratio-value">{formatCurrency(financialData.summary.ratii.venit_per_ora)}</span>
                    <span className="ratio-label">Venit per Oră</span>
                  </div>
                  <div className="ratio-item">
                    <span className="ratio-value">{formatCurrency(financialData.summary.ratii.profit_per_lucrator)}</span>
                    <span className="ratio-label">Profit per Lucrător</span>
                  </div>
                  <div className="ratio-item">
                    <span className="ratio-value">{formatNumber(financialData.summary.ratii.cost_salarial_percent, 1)}%</span>
                    <span className="ratio-label">Cost Salarial din Total</span>
                  </div>
                  <div className="ratio-item highlight">
                    <span className="ratio-value">{formatNumber(financialData.summary.profit_margin, 1)}%</span>
                    <span className="ratio-label">Marjă Profit</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Grafic PIE Rest Plată per Client */}
          {restPlataChartData.length > 0 && (
            <div className="card chart-section">
              <h3>💵 Distribuție Rest Plată pe Clienți</h3>
              <div className="pie-chart-container">
                <div className="pie-chart">
                  <svg viewBox="0 0 100 100">
                    {(() => {
                      let cumulativePercent = 0
                      return restPlataChartData.map((item, idx) => {
                        const percent = item.percent / 100
                        const startAngle = cumulativePercent * 2 * Math.PI
                        cumulativePercent += percent
                        const endAngle = cumulativePercent * 2 * Math.PI
                        
                        const x1 = 50 + 40 * Math.cos(startAngle - Math.PI / 2)
                        const y1 = 50 + 40 * Math.sin(startAngle - Math.PI / 2)
                        const x2 = 50 + 40 * Math.cos(endAngle - Math.PI / 2)
                        const y2 = 50 + 40 * Math.sin(endAngle - Math.PI / 2)
                        
                        const largeArcFlag = percent > 0.5 ? 1 : 0
                        
                        const pathData = [
                          `M 50 50`,
                          `L ${x1} ${y1}`,
                          `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                          `Z`
                        ].join(' ')
                        
                        return (
                          <path
                            key={idx}
                            d={pathData}
                            fill={item.color}
                            stroke="#1e293b"
                            strokeWidth="0.5"
                          >
                            <title>{item.name}: {formatCurrency(item.value)} ({formatNumber(item.percent, 1)}%)</title>
                          </path>
                        )
                      })
                    })()}
                  </svg>
                </div>
                <div className="chart-legend">
                  {restPlataChartData.map((item, idx) => (
                    <div key={idx} className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                      <span className="legend-label">{item.name}</span>
                      <span className="legend-value">{formatCurrency(item.value)}</span>
                      <span className="legend-percent">({formatNumber(item.percent, 1)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabel Rest Plată per Client */}
          {restPlataData && restPlataData.clients && restPlataData.clients.length > 0 && (
            <div className="card">
              <h3>💵 Rest Plată per Client</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Lucrători</th>
                      <th>Salariu Brut</th>
                      <th>Salariu Net</th>
                      <th>Rețineri</th>
                      <th>Rest Plată</th>
                      <th>% din Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restPlataData.clients.map((c, idx) => (
                      <tr key={idx}>
                        <td>{c.client__denumire}</td>
                        <td className="number">{c.workers_count}</td>
                        <td className="number">{formatCurrency(c.total_brut)}</td>
                        <td className="number">{formatCurrency(c.total_net)}</td>
                        <td className="number">{formatCurrency(c.total_retineri)}</td>
                        <td className="number highlight-cell">{formatCurrency(c.total_rest_plata)}</td>
                        <td className="number">{formatNumber(c.rest_plata_share_percent, 1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td><strong>TOTAL</strong></td>
                      <td className="number"><strong>{restPlataData.totals.total_clients}</strong></td>
                      <td className="number">-</td>
                      <td className="number"><strong>{formatCurrency(restPlataData.totals.total_net)}</strong></td>
                      <td className="number"><strong>{formatCurrency(restPlataData.totals.total_retineri)}</strong></td>
                      <td className="number highlight-cell"><strong>{formatCurrency(restPlataData.totals.total_rest_plata)}</strong></td>
                      <td className="number"><strong>100%</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {!financialData && !restPlataData && (
            <div className="empty-state card">
              <p>Selectează filtrele și apasă "Generează Raport" pentru a vedea datele financiare.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: FACTURARE */}
      {activeTab === 'billing' && (
        <div className="tab-content">
          <EcoFinBilling activeTab="billing" />
        </div>
      )}

      {/* TAB: RAPOARTE FACTURARE */}
      {activeTab === 'billing-reports' && (
        <div className="tab-content">
          <EcoFinBilling activeTab="billing-reports" />
        </div>
      )}
    </div>
  )
}

export default EcoFin
