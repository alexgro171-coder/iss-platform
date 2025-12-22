import { useState, useEffect } from 'react'
import { billingAPI, clientsAPI } from '../services/api'
import './EcoFinBilling.css'

/**
 * Componentă pentru facturare SmartBill în Eco-Fin
 */
function EcoFinBilling({ activeTab }) {
  // State pentru configurare
  const [smartbillConfigured, setSmartbillConfigured] = useState(false)
  const [configChecked, setConfigChecked] = useState(false)
  
  // State pentru facturare
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [invoicePreview, setInvoicePreview] = useState(null)
  const [hoursConfirmed, setHoursConfirmed] = useState(false)
  const [issueMode, setIssueMode] = useState('standard')
  const [extraLines, setExtraLines] = useState([])
  
  // State pentru lista facturi
  const [invoices, setInvoices] = useState([])
  const [invoiceFilters, setInvoiceFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
    client_id: '',
    payment_status: 'all',
    last_months: ''
  })
  
  // State pentru raport
  const [reportSummary, setReportSummary] = useState(null)
  const [syncLogs, setSyncLogs] = useState([])
  
  // Loading și mesaje
  const [loading, setLoading] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showExtraServicesModal, setShowExtraServicesModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [emailTo, setEmailTo] = useState('')

  // Constants
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

  // Verifică configurarea SmartBill la încărcare
  useEffect(() => {
    checkSmartBillConfig()
    loadClients()
  }, [])

  // Încarcă facturile când se schimbă filtrele sau tab-ul
  useEffect(() => {
    if (activeTab === 'billing-reports') {
      loadInvoices()
      loadReportSummary()
    }
  }, [activeTab, invoiceFilters])

  const checkSmartBillConfig = async () => {
    try {
      const result = await billingAPI.checkConfig()
      setSmartbillConfigured(result.configured)
    } catch (err) {
      setSmartbillConfigured(false)
    }
    setConfigChecked(true)
  }

  const loadClients = async () => {
    try {
      const data = await clientsAPI.getAll()
      setClients(data)
    } catch (err) {
      console.error('Error loading clients:', err)
    }
  }

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const data = await billingAPI.getInvoices(invoiceFilters)
      setInvoices(data)
    } catch (err) {
      setError('Eroare la încărcarea facturilor')
    }
    setLoading(false)
  }

  const loadReportSummary = async () => {
    try {
      const data = await billingAPI.getBillingReportSummary(invoiceFilters)
      setReportSummary(data)
    } catch (err) {
      console.error('Error loading report summary:', err)
    }
  }

  const loadSyncLogs = async () => {
    try {
      const data = await billingAPI.getSyncLogs()
      setSyncLogs(data)
    } catch (err) {
      console.error('Error loading sync logs:', err)
    }
  }

  // Preview factură
  const handlePreview = async () => {
    if (!selectedClient || !selectedYear || !selectedMonth) {
      setError('Selectați clientul, anul și luna')
      return
    }

    setError('')
    setLoading(true)
    try {
      const preview = await billingAPI.previewInvoice(
        selectedClient, 
        selectedYear, 
        selectedMonth
      )
      setInvoicePreview(preview)
      setShowPreviewModal(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la generarea preview-ului')
    }
    setLoading(false)
  }

  // Emite factură
  const handleIssueInvoice = async () => {
    if (!hoursConfirmed) {
      setError('Trebuie să confirmați că orele sunt cele agreate cu clientul')
      return
    }

    setIssuing(true)
    setError('')
    try {
      const data = {
        client_id: parseInt(selectedClient),
        year: parseInt(selectedYear),
        month: parseInt(selectedMonth),
        confirm_hours_agreed: true,
        mode: issueMode,
        extra_lines: issueMode === 'extra_services' ? extraLines : []
      }

      const result = await billingAPI.issueInvoice(data)
      setSuccess(result.message || 'Factură emisă cu succes!')
      setShowPreviewModal(false)
      setInvoicePreview(null)
      setHoursConfirmed(false)
      loadInvoices()
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la emiterea facturii')
    }
    setIssuing(false)
  }

  // Download PDF
  const handleDownloadPDF = async (invoiceId) => {
    try {
      const blob = await billingAPI.downloadInvoicePDF(invoiceId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura_${invoiceId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Eroare la descărcarea PDF-ului')
    }
  }

  // Print PDF
  const handlePrintPDF = async (invoiceId) => {
    try {
      const blob = await billingAPI.downloadInvoicePDF(invoiceId)
      const url = window.URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
    } catch (err) {
      setError('Eroare la încărcarea PDF-ului pentru print')
    }
  }

  // Send email
  const handleSendEmail = async () => {
    if (!selectedInvoice) return
    
    setLoading(true)
    try {
      await billingAPI.sendInvoiceEmail(selectedInvoice.id, emailTo || null)
      setSuccess('Email trimis cu succes!')
      setShowEmailModal(false)
      setEmailTo('')
      loadInvoices()
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la trimiterea email-ului')
    }
    setLoading(false)
  }

  // Sync payments
  const handleSyncPayments = async () => {
    setSyncing(true)
    setError('')
    try {
      const result = await billingAPI.syncPayments()
      setSuccess(result.message || 'Sincronizare completă!')
      loadInvoices()
      loadReportSummary()
      loadSyncLogs()
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la sincronizarea plăților')
    }
    setSyncing(false)
  }

  // Export
  const handleExportExcel = async () => {
    try {
      const blob = await billingAPI.exportBillingExcel(invoiceFilters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `raport_facturare_${new Date().toISOString().slice(0,10)}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Eroare la export')
    }
  }

  const handleExportPDF = async () => {
    try {
      const blob = await billingAPI.exportBillingPDF(invoiceFilters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `raport_facturare_${new Date().toISOString().slice(0,10)}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Eroare la export')
    }
  }

  // Adaugă linie serviciu suplimentar
  const addExtraLine = () => {
    setExtraLines([...extraLines, {
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: 21
    }])
  }

  const updateExtraLine = (index, field, value) => {
    const updated = [...extraLines]
    updated[index][field] = value
    setExtraLines(updated)
  }

  const removeExtraLine = (index) => {
    setExtraLines(extraLines.filter((_, i) => i !== index))
  }

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON'
    }).format(value || 0)
  }

  // Dacă SmartBill nu e configurat
  if (configChecked && !smartbillConfigured) {
    return (
      <div className="billing-not-configured">
        <div className="warning-icon">⚠️</div>
        <h3>SmartBill nu este configurat</h3>
        <p>
          Pentru a utiliza funcționalitatea de facturare, este necesară configurarea
          credențialelor SmartBill în variabilele de mediu ale serverului.
        </p>
        <ul>
          <li>SMARTBILL_USERNAME</li>
          <li>SMARTBILL_TOKEN</li>
          <li>SMARTBILL_COMPANY_CIF</li>
          <li>SMARTBILL_SERIES</li>
        </ul>
        <p>Contactați administratorul sistemului pentru configurare.</p>
      </div>
    )
  }

  // TAB: FACTURARE
  if (activeTab === 'billing') {
    return (
      <div className="billing-container">
        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        <div className="billing-form card">
          <h3>📋 Emitere Factură</h3>
          
          <div className="billing-filters">
            <div className="form-group">
              <label>Client</label>
              <select 
                value={selectedClient} 
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">Selectați client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.denumire}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>An</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Luna</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <button 
              className="btn btn-primary"
              onClick={handlePreview}
              disabled={loading || !selectedClient}
            >
              {loading ? 'Se încarcă...' : '👁️ Vizualizare Factură'}
            </button>
          </div>
        </div>

        {/* Modal Preview Factură */}
        {showPreviewModal && invoicePreview && (
          <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📄 Preview Factură</h3>
                <button className="close-btn" onClick={() => setShowPreviewModal(false)}>×</button>
              </div>
              
              <div className="modal-body">
                {/* Avertismente */}
                {invoicePreview.warnings?.length > 0 && (
                  <div className="preview-warnings">
                    {invoicePreview.warnings.map((w, i) => (
                      <div key={i} className="warning-item">⚠️ {w}</div>
                    ))}
                  </div>
                )}

                {/* Info client */}
                <div className="preview-info">
                  <p><strong>Client:</strong> {invoicePreview.client_name}</p>
                  <p><strong>Perioadă:</strong> {invoicePreview.month_name} {invoicePreview.year}</p>
                  <p><strong>Ore lucrate:</strong> {invoicePreview.total_hours}</p>
                  <p><strong>Tarif orar:</strong> {formatCurrency(invoicePreview.hourly_rate)}</p>
                </div>

                {/* Linii factură */}
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Descriere</th>
                      <th>Cant.</th>
                      <th>Preț</th>
                      <th>TVA</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicePreview.lines?.map((line, i) => (
                      <tr key={i}>
                        <td>{line.description}</td>
                        <td>{line.quantity}</td>
                        <td>{formatCurrency(line.unit_price)}</td>
                        <td>{line.vat_rate}%</td>
                        <td>{formatCurrency(line.line_total + line.line_vat)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4"><strong>Subtotal (fără TVA)</strong></td>
                      <td><strong>{formatCurrency(invoicePreview.subtotal)}</strong></td>
                    </tr>
                    <tr>
                      <td colSpan="4"><strong>TVA ({invoicePreview.vat_rate}%)</strong></td>
                      <td><strong>{formatCurrency(invoicePreview.vat_total)}</strong></td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan="4"><strong>TOTAL</strong></td>
                      <td><strong>{formatCurrency(invoicePreview.total)}</strong></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Mod emitere */}
                {invoicePreview.existing_invoices?.length > 0 && (
                  <div className="issue-mode-selector">
                    <p>Există facturi pentru această perioadă. Selectați modul de emitere:</p>
                    <div className="mode-options">
                      <label>
                        <input 
                          type="radio" 
                          name="issueMode" 
                          value="standard"
                          checked={issueMode === 'standard'}
                          onChange={() => setIssueMode('standard')}
                        />
                        Factură standard (servicii complete)
                      </label>
                      {invoicePreview.subtotal > invoicePreview.already_billed_amount && (
                        <label>
                          <input 
                            type="radio" 
                            name="issueMode" 
                            value="difference"
                            checked={issueMode === 'difference'}
                            onChange={() => setIssueMode('difference')}
                          />
                          Diferență ({formatCurrency(invoicePreview.subtotal - invoicePreview.already_billed_amount)})
                        </label>
                      )}
                      <label>
                        <input 
                          type="radio" 
                          name="issueMode" 
                          value="extra_services"
                          checked={issueMode === 'extra_services'}
                          onChange={() => setIssueMode('extra_services')}
                        />
                        Servicii suplimentare
                      </label>
                    </div>
                  </div>
                )}

                {/* Servicii suplimentare */}
                {issueMode === 'extra_services' && (
                  <div className="extra-services-section">
                    <h4>Servicii suplimentare</h4>
                    {extraLines.map((line, i) => (
                      <div key={i} className="extra-line">
                        <input 
                          type="text"
                          placeholder="Descriere"
                          value={line.description}
                          onChange={(e) => updateExtraLine(i, 'description', e.target.value)}
                        />
                        <input 
                          type="number"
                          placeholder="Cantitate"
                          value={line.quantity}
                          onChange={(e) => updateExtraLine(i, 'quantity', parseFloat(e.target.value))}
                        />
                        <input 
                          type="number"
                          placeholder="Preț"
                          value={line.unit_price}
                          onChange={(e) => updateExtraLine(i, 'unit_price', parseFloat(e.target.value))}
                        />
                        <input 
                          type="number"
                          placeholder="TVA %"
                          value={line.vat_rate}
                          onChange={(e) => updateExtraLine(i, 'vat_rate', parseFloat(e.target.value))}
                        />
                        <button onClick={() => removeExtraLine(i)}>🗑️</button>
                      </div>
                    ))}
                    <button className="btn btn-secondary" onClick={addExtraLine}>
                      + Adaugă serviciu
                    </button>
                  </div>
                )}

                {/* Confirmare ore */}
                <div className="confirm-hours">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={hoursConfirmed}
                      onChange={(e) => setHoursConfirmed(e.target.checked)}
                    />
                    <strong>Confirm că numărul de ore afișat este cel agreat cu clientul</strong>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowPreviewModal(false)}
                >
                  Anulează
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleIssueInvoice}
                  disabled={issuing || !hoursConfirmed}
                >
                  {issuing ? 'Se emite...' : '✅ Emite Factură în SmartBill'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Email */}
        {showEmailModal && selectedInvoice && (
          <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📧 Trimitere Email</h3>
                <button className="close-btn" onClick={() => setShowEmailModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Trimite factura {selectedInvoice.invoice_number_display} către client.</p>
                <div className="form-group">
                  <label>Email destinatar (opțional - implicit email client)</label>
                  <input 
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>
                  Anulează
                </button>
                <button className="btn btn-primary" onClick={handleSendEmail} disabled={loading}>
                  {loading ? 'Se trimite...' : '📨 Trimite Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // TAB: RAPOARTE FACTURARE
  if (activeTab === 'billing-reports') {
    return (
      <div className="billing-reports-container">
        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {/* Filtre */}
        <div className="card filters-section">
          <div className="filters-row">
            <div className="form-group">
              <label>An</label>
              <select 
                value={invoiceFilters.year} 
                onChange={(e) => setInvoiceFilters({...invoiceFilters, year: e.target.value})}
              >
                <option value="">Toți anii</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Luna</label>
              <select 
                value={invoiceFilters.month} 
                onChange={(e) => setInvoiceFilters({...invoiceFilters, month: e.target.value})}
              >
                <option value="">Toate lunile</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Client</label>
              <select 
                value={invoiceFilters.client_id} 
                onChange={(e) => setInvoiceFilters({...invoiceFilters, client_id: e.target.value})}
              >
                <option value="">Toți clienții</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.denumire}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status încasare</label>
              <select 
                value={invoiceFilters.payment_status} 
                onChange={(e) => setInvoiceFilters({...invoiceFilters, payment_status: e.target.value})}
              >
                <option value="all">Toate</option>
                <option value="paid">Încasate</option>
                <option value="partial">Parțial</option>
                <option value="unpaid">Neîncasate</option>
              </select>
            </div>

            <div className="form-group">
              <label>Ultimele</label>
              <select 
                value={invoiceFilters.last_months} 
                onChange={(e) => setInvoiceFilters({...invoiceFilters, last_months: e.target.value})}
              >
                <option value="">-</option>
                <option value="3">3 luni</option>
                <option value="6">6 luni</option>
                <option value="12">12 luni</option>
              </select>
            </div>
          </div>

          <div className="filters-actions">
            <button className="btn btn-secondary" onClick={handleExportExcel}>
              📊 Export Excel
            </button>
            <button className="btn btn-secondary" onClick={handleExportPDF}>
              📄 Export PDF
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSyncPayments}
              disabled={syncing}
            >
              {syncing ? 'Se sincronizează...' : '🔄 Sincronizează Plăți'}
            </button>
          </div>
        </div>

        {/* Sumar */}
        {reportSummary && (
          <div className="summary-grid">
            <div className="summary-card">
              <h4>📋 Facturi</h4>
              <p className="big-number">{reportSummary.invoice_count}</p>
            </div>
            <div className="summary-card">
              <h4>💰 Total Facturat</h4>
              <p className="big-number">{formatCurrency(reportSummary.totals?.total)}</p>
            </div>
            <div className="summary-card success">
              <h4>✅ Încasat</h4>
              <p className="big-number">{formatCurrency(reportSummary.totals?.paid)}</p>
            </div>
            <div className="summary-card danger">
              <h4>⏳ De încasat</h4>
              <p className="big-number">{formatCurrency(reportSummary.totals?.due)}</p>
            </div>
          </div>
        )}

        {/* Status breakdown */}
        {reportSummary?.status_breakdown && (
          <div className="status-breakdown card">
            <h4>Status încasări</h4>
            <div className="breakdown-items">
              <div className="breakdown-item success">
                <span>✅ Încasate</span>
                <span>{reportSummary.status_breakdown.paid}</span>
              </div>
              <div className="breakdown-item warning">
                <span>⚡ Parțial</span>
                <span>{reportSummary.status_breakdown.partial}</span>
              </div>
              <div className="breakdown-item danger">
                <span>⏳ Neîncasate</span>
                <span>{reportSummary.status_breakdown.unpaid}</span>
              </div>
            </div>
          </div>
        )}

        {/* Lista facturi */}
        <div className="invoices-list card">
          <h4>📋 Lista Facturi</h4>
          {loading ? (
            <div className="loading">Se încarcă...</div>
          ) : invoices.length === 0 ? (
            <p className="empty-message">Nu există facturi pentru filtrele selectate.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Serie/Nr.</th>
                  <th>Client</th>
                  <th>Perioadă</th>
                  <th>Data</th>
                  <th>Total</th>
                  <th>Încasat</th>
                  <th>Sold</th>
                  <th>Status</th>
                  <th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td><strong>{inv.invoice_number_display}</strong></td>
                    <td>{inv.client_denumire}</td>
                    <td>{inv.month}/{inv.year}</td>
                    <td>{inv.issue_date}</td>
                    <td>{formatCurrency(inv.total)}</td>
                    <td className="text-success">{formatCurrency(inv.paid_amount)}</td>
                    <td className={inv.due_amount > 0 ? 'text-danger' : ''}>
                      {formatCurrency(inv.due_amount)}
                    </td>
                    <td>
                      <span className={`status-badge ${inv.payment_status}`}>
                        {inv.payment_status_display}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {inv.pdf_path && (
                          <>
                            <button 
                              className="btn-icon" 
                              onClick={() => handleDownloadPDF(inv.id)}
                              title="Descarcă PDF"
                            >
                              📥
                            </button>
                            <button 
                              className="btn-icon" 
                              onClick={() => handlePrintPDF(inv.id)}
                              title="Printează"
                            >
                              🖨️
                            </button>
                          </>
                        )}
                        <button 
                          className="btn-icon" 
                          onClick={() => {
                            setSelectedInvoice(inv)
                            setShowEmailModal(true)
                          }}
                          title="Trimite email"
                        >
                          📧
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Email */}
        {showEmailModal && selectedInvoice && (
          <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📧 Trimitere Email</h3>
                <button className="close-btn" onClick={() => setShowEmailModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Trimite factura {selectedInvoice.invoice_number_display} către client.</p>
                <div className="form-group">
                  <label>Email destinatar (opțional)</label>
                  <input 
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>
                  Anulează
                </button>
                <button className="btn btn-primary" onClick={handleSendEmail} disabled={loading}>
                  {loading ? 'Se trimite...' : '📨 Trimite'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

export default EcoFinBilling

