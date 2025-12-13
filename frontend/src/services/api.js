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

  // === RAPOARTE ===
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

  updateReport: async (id, data) => {
    const response = await api.patch(`/eco-fin/reports/${id}/`, data)
    return response.data
  },

  deleteReport: async (id) => {
    await api.delete(`/eco-fin/reports/${id}/`)
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

  validateImport: async (year, month, rows) => {
    const response = await api.post('/eco-fin/import/validate/', {
      year,
      month,
      rows
    })
    return response.data
  },

  getImportBatches: async () => {
    const response = await api.get('/eco-fin/import/batches/')
    return response.data
  },
}

export default api

