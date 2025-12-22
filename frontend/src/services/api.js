import axios from 'axios'

// Configurare API - funcționează atât local cât și în producție
// În producție, Nginx face proxy de la /api la backend
const API_BASE_URL = '/api'

// Crează instanța axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor pentru a adăuga token-ul JWT la fiecare cerere
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor pentru a gestiona răspunsurile și erorile
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Dacă primim 401 și nu am încercat deja refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          // Încercăm să reîmprospătăm token-ul
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          })

          const { access } = response.data
          localStorage.setItem('access_token', access)

          // Reîncercăm cererea originală
          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh a eșuat - delogăm utilizatorul
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// ============================================
// AUTH API
// ============================================

export const authAPI = {
  // Login - obține token-uri JWT
  login: async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/token/`, {
      username,
      password,
    })
    return response.data
  },

  // Obține informațiile utilizatorului curent
  getCurrentUser: async () => {
    const response = await api.get('/me/')
    return response.data
  },

  // Refresh token
  refreshToken: async (refreshToken) => {
    const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
      refresh: refreshToken,
    })
    return response.data
  },
}

// ============================================
// WORKERS API
// ============================================

export const workersAPI = {
  // Listare cu filtre
  getAll: async (filters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })
    const response = await api.get(`/workers/?${params}`)
    return response.data
  },

  // Obține un lucrător
  getById: async (id) => {
    const response = await api.get(`/workers/${id}/`)
    return response.data
  },

  // Crează lucrător nou
  create: async (data) => {
    const response = await api.post('/workers/', data)
    return response.data
  },

  // Actualizează lucrător
  update: async (id, data) => {
    const response = await api.patch(`/workers/${id}/`, data)
    return response.data
  },

  // Șterge lucrător
  delete: async (id) => {
    await api.delete(`/workers/${id}/`)
  },
}

// ============================================
// CLIENTS API
// ============================================

export const clientsAPI = {
  // Listare toți clienții
  getAll: async () => {
    const response = await api.get('/clients/')
    return response.data
  },

  // Obține un client
  getById: async (id) => {
    const response = await api.get(`/clients/${id}/`)
    return response.data
  },

  // Crează client nou
  create: async (data) => {
    const response = await api.post('/clients/', data)
    return response.data
  },

  // Actualizează client
  update: async (id, data) => {
    const response = await api.patch(`/clients/${id}/`, data)
    return response.data
  },

  // Șterge client
  delete: async (id) => {
    await api.delete(`/clients/${id}/`)
  },
}

// ============================================
// CODURI COR API
// ============================================

export const coduriCORAPI = {
  // Listare toate codurile COR
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.activ !== undefined) queryParams.append('activ', params.activ)
    if (params.search) queryParams.append('search', params.search)
    const response = await api.get(`/coduri-cor/?${queryParams}`)
    return response.data
  },

  // Obține un cod COR
  getById: async (id) => {
    const response = await api.get(`/coduri-cor/${id}/`)
    return response.data
  },

  // Crează cod COR nou
  create: async (data) => {
    const response = await api.post('/coduri-cor/', data)
    return response.data
  },

  // Actualizează cod COR
  update: async (id, data) => {
    const response = await api.patch(`/coduri-cor/${id}/`, data)
    return response.data
  },

  // Șterge cod COR
  delete: async (id) => {
    await api.delete(`/coduri-cor/${id}/`)
  },
}

// ============================================
// AMBASADE API
// ============================================

export const ambasadeAPI = {
  // Listare toate ambasadele
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.activ !== undefined) queryParams.append('activ', params.activ)
    if (params.search) queryParams.append('search', params.search)
    const response = await api.get(`/ambasade/?${queryParams}`)
    return response.data
  },

  // Obține o ambasadă
  getById: async (id) => {
    const response = await api.get(`/ambasade/${id}/`)
    return response.data
  },
}

// ============================================
// WORKER DOCUMENTS API
// ============================================

export const workerDocumentsAPI = {
  // Listare documente pentru un lucrător
  getByWorkerId: async (workerId) => {
    const response = await api.get(`/worker-documents/?worker_id=${workerId}`)
    return response.data
  },

  // Upload document nou
  upload: async (workerId, file, documentType = 'altele', description = '') => {
    const formData = new FormData()
    formData.append('worker_id', workerId)
    formData.append('file', file)
    formData.append('document_type', documentType)
    formData.append('description', description)

    const response = await api.post('/worker-documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Șterge document
  delete: async (documentId) => {
    await api.delete(`/worker-documents/${documentId}/`)
  },

  // Descarcă document (returnează URL-ul)
  getDownloadUrl: (documentId) => {
    return `${API_BASE_URL}/worker-documents/${documentId}/`
  },
}

// ============================================
// TEMPLATES API
// ============================================

export const templatesAPI = {
  // Listare tipuri de template-uri cu status
  getTypes: async () => {
    const response = await api.get('/templates/types/')
    return response.data
  },

  // Listare template-uri
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.template_type) queryParams.append('template_type', params.template_type)
    if (params.active_only !== undefined) queryParams.append('active_only', params.active_only)
    const response = await api.get(`/templates/?${queryParams}`)
    return response.data
  },

  // Upload template nou
  upload: async (templateType, file, description = '') => {
    const formData = new FormData()
    formData.append('template_type', templateType)
    formData.append('file', file)
    formData.append('description', description)

    const response = await api.post('/templates/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  // Generare document
  generate: async (templateType, workerId, outputFormat = 'docx') => {
    const response = await api.post('/templates/generate/', {
      template_type: templateType,
      worker_id: workerId,
      output_format: outputFormat,
    }, {
      responseType: 'blob',  // Important pentru descărcare fișier
    })
    return response
  },

  // Istoric documente generate
  getHistory: async () => {
    const response = await api.get('/templates/history/')
    return response.data
  },

  // Lista placeholder-uri
  getPlaceholders: async () => {
    const response = await api.get('/templates/placeholders/')
    return response.data
  },

  // Șterge template
  delete: async (id) => {
    await api.delete(`/templates/${id}/`)
  },
}

// ============================================
// ECO-FIN API (Microserviciu Profitabilitate)
// ============================================

export const ecoFinAPI = {
  // === SETĂRI ===
  getSettings: async (year, month) => {
    const response = await api.get(`/eco-fin/settings/current/${year}/${month}/`)
    return response.data
  },

  getAllSettings: async () => {
    const response = await api.get('/eco-fin/settings/')
    return response.data
  },

  createSettings: async (data) => {
    const response = await api.post('/eco-fin/settings/', data)
    return response.data
  },

  updateSettings: async (id, data) => {
    const response = await api.patch(`/eco-fin/settings/${id}/`, data)
    return response.data
  },

  // === ÎNREGISTRĂRI PROCESATE (nou) ===
  getRecords: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/records/?${queryParams}`)
    return response.data
  },

  getRecordsSummary: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/records/summary/?${queryParams}`)
    return response.data
  },

  validateMonth: async (year, month) => {
    const response = await api.post('/eco-fin/records/validate-month/', { year, month })
    return response.data
  },

  // === RAPOARTE (compatibilitate) ===
  getReports: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/reports/?${queryParams}`)
    return response.data
  },

  getReportSummary: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/reports/summary/?${queryParams}`)
    return response.data
  },

  // === RAPOARTE NOI ===
  getReportByClient: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/report/client/?${queryParams}`)
    return response.data
  },

  getReportWorkersByClient: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/report/workers/?${queryParams}`)
    return response.data
  },

  getReportAllClients: async (year, month) => {
    const response = await api.get(`/eco-fin/report/all/?year=${year}&month=${month}`)
    return response.data
  },

  getReportInterval: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/report/interval/?${queryParams}`)
    return response.data
  },

  // === RAPOARTE FINANCIARE (REST PLATĂ, REȚINERI) ===
  getReportRestPlata: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/report/rest-plata/?${queryParams}`)
    return response.data
  },

  getReportRestPlataByClient: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/report/rest-plata-client/?${queryParams}`)
    return response.data
  },

  getReportRetineri: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/report/retineri/?${queryParams}`)
    return response.data
  },

  getFinancialSummary: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/report/financial-summary/?${queryParams}`)
    return response.data
  },

  // === IMPORT ===
  uploadExcel: async (file, year, month) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('year', year)
    formData.append('month', month)

    const response = await api.post('/eco-fin/import/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  processImport: async (batchId, year, month, rows) => {
    const response = await api.post('/eco-fin/import/process/', {
      batch_id: batchId,
      year,
      month,
      rows
    })
    return response.data
  },

  // Compatibilitate
  validateImport: async (year, month, rows) => {
    const response = await api.post('/eco-fin/import/process/', {
      year,
      month,
      rows
    })
    return response.data
  },

  getImportBatches: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/import/batches/?${queryParams}`)
    return response.data
  },

  downloadTemplate: async () => {
    try {
      const response = await api.get('/eco-fin/import/template/', {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('Download template error:', error)
      throw error
    }
  },

  // === EXPORT ===
  exportPDF: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/export/pdf/?${queryParams}`, {
      responseType: 'blob'
    })
    return response.data
  },

  exportWord: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/export/word/?${queryParams}`, {
      responseType: 'blob'
    })
    return response.data
  },
}

// ============================================
// BILLING API (SmartBill)
// ============================================

export const billingAPI = {
  // === CONFIGURARE ===
  checkConfig: async () => {
    const response = await api.get('/eco-fin/billing/invoices/check-config/')
    return response.data
  },

  // === FACTURI ===
  getInvoices: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/billing/invoices/?${queryParams}`)
    return response.data
  },

  getInvoice: async (id) => {
    const response = await api.get(`/eco-fin/billing/invoices/${id}/`)
    return response.data
  },

  previewInvoice: async (clientId, year, month) => {
    const response = await api.post('/eco-fin/billing/invoices/preview/', {
      client_id: clientId,
      year,
      month
    })
    return response.data
  },

  issueInvoice: async (data) => {
    const response = await api.post('/eco-fin/billing/invoices/issue/', data)
    return response.data
  },

  downloadInvoicePDF: async (id) => {
    const response = await api.get(`/eco-fin/billing/invoices/${id}/pdf/`, {
      responseType: 'blob'
    })
    return response.data
  },

  sendInvoiceEmail: async (id, emailTo = null) => {
    const data = emailTo ? { email_to: emailTo } : {}
    const response = await api.post(`/eco-fin/billing/invoices/${id}/send-email/`, data)
    return response.data
  },

  // === SINCRONIZARE PLĂȚI ===
  syncPayments: async () => {
    const response = await api.post('/eco-fin/billing/sync/sync-payments/')
    return response.data
  },

  getSyncLogs: async () => {
    const response = await api.get('/eco-fin/billing/sync/sync-logs/')
    return response.data
  },

  // === RAPOARTE FACTURARE ===
  getBillingReportSummary: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/billing/reports/summary/?${queryParams}`)
    return response.data
  },

  exportBillingExcel: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/billing/export/excel/?${queryParams}`, {
      responseType: 'blob'
    })
    return response.data
  },

  exportBillingPDF: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value)
    })
    const response = await api.get(`/eco-fin/billing/export/pdf/?${queryParams}`, {
      responseType: 'blob'
    })
    return response.data
  },
}

export default api

