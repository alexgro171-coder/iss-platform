import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Workers from './pages/Workers'
import WorkerForm from './pages/WorkerForm'
import Clients from './pages/Clients'
import Reports from './pages/Reports'
import BulkImport from './pages/BulkImport'
import Templates from './pages/Templates'
import CoduriCOR from './pages/CoduriCOR'
import EcoFin from './pages/EcoFin'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Se încarcă...</p>
      </div>
    )
  }

  return (
    <Routes>
      {/* Ruta publică - Login */}
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" /> : <Login />} 
      />

      {/* Rute protejate - necesită autentificare */}
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/workers/new" element={<WorkerForm />} />
          <Route path="/workers/:id" element={<WorkerForm />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/import-bulk" element={<BulkImport />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/coduri-cor" element={<CoduriCOR />} />
          <Route path="/eco-fin" element={<EcoFin />} />
        </Route>
      </Route>

      {/* Redirect implicit */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  )
}

export default App

