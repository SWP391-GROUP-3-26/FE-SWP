import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './auth/roleConfig'
import CenterManagerDashboard from './pages/CenterManagerDashboard'
import ClassManagement from './pages/ClassManagement'
import CoachDashboard from './pages/CoachDashboard'
import Landing from './pages/Landing'
import GoogleCallback from './pages/GoogleCallback'
import Login from './pages/Login'
import MemberClasses from './pages/MemberClasses'
import MemberDashboard from './pages/MemberDashboard'
import MemberPackages from './pages/MemberPackages'
import MemberProfile from './pages/MemberProfile'
import MemberSchedule from './pages/MemberSchedule'
import PackageManagement from './pages/PackageManagement'
import ReceptionistDashboard from './pages/ReceptionistDashboard'
import Register from './pages/Register'
import SubjectManagement from './pages/SubjectManagement'
import UserManagement from './pages/UserManagement'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/google-verify" element={<GoogleCallback />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/member"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MEMBER]}>
              <MemberDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/profile"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MEMBER]}>
              <MemberProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/schedule"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MEMBER]}>
              <MemberSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/packages"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MEMBER]}>
              <MemberPackages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/classes"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MEMBER]}>
              <MemberClasses />
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
        <Route
          path="/center-manager/users"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/center-manager/classes"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER]}>
              <ClassManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/center-manager/packages"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER]}>
              <PackageManagement />
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
