import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './auth/roleConfig'
import CenterManagerDashboard from './pages/CenterManagerDashboard'
import CoachDashboard from './pages/CoachDashboard'
import Landing from './pages/Landing'
import GoogleCallback from './pages/GoogleCallback'
import Login from './pages/Login'
import MemberDashboard from './pages/MemberDashboard'
import ReceptionistDashboard from './pages/ReceptionistDashboard'
import ReceptionistMemberDetail from './pages/ReceptionistMemberDetail'
import Register from './pages/Register'
import ReceptionistRegisterMember from './pages/ReceptionistRegisterMember'
import SubjectManagement from './pages/SubjectManagement'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/google-verify" element={<GoogleCallback />} />
        <Route path="/register" element={<Register />} />
        <Route path="/receptionist/register-member" element={
          <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
            <ReceptionistRegisterMember />
          </ProtectedRoute>
        } />
        <Route
          path="/member"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MEMBER]}>
              <MemberDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receptionist"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
              <ReceptionistDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receptionist/members/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
              <ReceptionistMemberDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach"
          element={
            <ProtectedRoute allowedRoles={[ROLES.COACH]}>
              <CoachDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/center-manager"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER]}>
              <CenterManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/subjects" element={
          <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER, ROLES.RECEPTIONIST]}>
            <SubjectManagement />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
