import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import ProtectedRoute from './components/ProtectedRoute'
import { ROLE_IDS } from './auth/roleConfig'
import CenterManagerDashboard from './pages/CenterManagerDashboard'
import CoachDashboard from './pages/CoachDashboard'
import Landing from './pages/Landing'
import Login from './pages/Login'
import ReceptionistDashboard from './pages/ReceptionistDashboard'
import Register from './pages/Register'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/receptionist"
          element={
            <ProtectedRoute allowedRoleIds={[ROLE_IDS.RECEPTIONIST]}>
              <ReceptionistDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach"
          element={
            <ProtectedRoute allowedRoleIds={[ROLE_IDS.COACH]}>
              <CoachDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/center-manager"
          element={
            <ProtectedRoute allowedRoleIds={[ROLE_IDS.CENTER_MANAGER]}>
              <CenterManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
