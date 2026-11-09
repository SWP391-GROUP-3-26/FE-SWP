import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import ProtectedRoute from './components/ProtectedRoute'
import LocalizationBridge from './components/LocalizationBridge'
import { ROLES } from './auth/roleConfig'
const CenterManagerDashboard = lazy(() => import('./pages/CenterManagerDashboard'))
const CenterManagerFinance = lazy(() => import('./pages/CenterManagerFinance'))
const AuditLog = lazy(() => import('./pages/AuditLog'))
const ClassManagement = lazy(() => import('./pages/ClassManagement'))
const RoomManagement = lazy(() => import('./pages/RoomManagement'))
const CoachDashboard = lazy(() => import('./pages/CoachDashboard'))
const CoachClasses = lazy(() => import('./pages/CoachClasses'))
const CoachClassDetail = lazy(() => import('./pages/CoachClassDetail'))
const CoachTrainingPlans = lazy(() => import('./pages/CoachTrainingPlans'))
const MemberTrainingPlans = lazy(() => import('./pages/MemberTrainingPlans'))
const TrainingPlanDetail = lazy(() => import('./pages/TrainingPlanDetail'))
const Landing = lazy(() => import('./pages/Landing'))
const GoogleCallback = lazy(() => import('./pages/GoogleCallback'))
const Login = lazy(() => import('./pages/Login'))
const MemberClasses = lazy(() => import('./pages/MemberClasses'))
const MemberDashboard = lazy(() => import('./pages/MemberDashboard'))
const MemberPackages = lazy(() => import('./pages/MemberPackages'))
const MemberPackageHistory = lazy(() => import('./pages/MemberPackageHistory'))
const MemberPaymentResult = lazy(() => import('./pages/MemberPaymentResult'))
const MemberPaymentHistory = lazy(() => import('./pages/MemberPaymentHistory'))
const StaffRefunds = lazy(() => import('./pages/StaffRefunds'))
const MemberProfile = lazy(() => import('./pages/MemberProfile'))
const MemberSchedule = lazy(() => import('./pages/MemberSchedule'))
const PackageManagement = lazy(() => import('./pages/PackageManagement'))
const ReceptionistDashboard = lazy(() => import('./pages/ReceptionistDashboard'))
const ReceptionistMemberDetail = lazy(() => import('./pages/ReceptionistMemberDetail'))
const ReceptionistMemberRegister = lazy(() => import('./pages/ReceptionistMemberRegister'))
const ReceptionistMemberSearch = lazy(() => import('./pages/ReceptionistMemberSearch'))
const ReceptionistRegistrationPage = lazy(() => import('./pages/ReceptionistRegistrationPage'))
const ReceptionistCheckout = lazy(() => import('./pages/ReceptionistCheckout'))
const Register = lazy(() => import('./pages/Register'))
const ReceptionistRegisterMember = lazy(() => import('./pages/ReceptionistRegisterMember'))
const SubjectManagement = lazy(() => import('./pages/SubjectManagement'))
const UserManagement = lazy(() => import('./pages/UserManagement'))

const MemberChat = lazy(() => import('./pages/MemberChat'))

function App() {
  return (
    <BrowserRouter>
      <LocalizationBridge />
      <Suspense fallback={<div className="app-route-loading" role="status">Đang tải trang…</div>}>
      <Routes>
        <Route path="/member/payment-history" element={<ProtectedRoute allowedRoles={[ROLES.MEMBER]}><MemberPaymentHistory /></ProtectedRoute>} />
        <Route path="/member/payment-history/:id" element={<ProtectedRoute allowedRoles={[ROLES.MEMBER]}><MemberPaymentHistory /></ProtectedRoute>} />
        <Route path="/center-manager/refunds" element={<ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER, ROLES.ADMIN]}><StaffRefunds /></ProtectedRoute>} />
        <Route path="/center-manager/refunds/:id" element={<ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER, ROLES.ADMIN]}><StaffRefunds /></ProtectedRoute>} />
        <Route path="/receptionist/refunds" element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}><StaffRefunds audience="receptionist" /></ProtectedRoute>} />
        <Route path="/receptionist/refunds/:id" element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}><StaffRefunds audience="receptionist" /></ProtectedRoute>} />
        <Route path="/coach/training-plans" element={<ProtectedRoute allowedRoles={[ROLES.COACH]}><CoachTrainingPlans /></ProtectedRoute>} />
        <Route path="/coach/training-plans/:id" element={<ProtectedRoute allowedRoles={[ROLES.COACH]}><TrainingPlanDetail audience="coach" /></ProtectedRoute>} />
        <Route path="/member/training-plans" element={<ProtectedRoute allowedRoles={[ROLES.MEMBER]}><MemberTrainingPlans /></ProtectedRoute>} />
        <Route path="/member/training-plans/:id" element={<ProtectedRoute allowedRoles={[ROLES.MEMBER]}><TrainingPlanDetail /></ProtectedRoute>} />
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
          path="/member/packages/history"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MEMBER]}>
              <MemberPackageHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/payment-result"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MEMBER]}>
              <MemberPaymentResult />
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
          path="/member/chat"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MEMBER]}>
              <Suspense fallback={<div className="member-chat-widget-loading" role="status">Đang mở hộp chat...</div>}>
                <MemberChat />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach/chat"
          element={
            <ProtectedRoute allowedRoles={[ROLES.COACH]}>
              <Suspense fallback={<div className="member-chat-widget-loading" role="status">Đang mở hộp chat...</div>}>
                <MemberChat audience="coach" />
              </Suspense>
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
          path="/receptionist/members"
          element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}><ReceptionistMemberSearch /></ProtectedRoute>}
        />
        <Route
          path="/receptionist/members/new"
          element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}><ReceptionistMemberRegister /></ProtectedRoute>}
        />
        <Route
          path="/receptionist/members/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
              <ReceptionistMemberDetail />
            </ProtectedRoute>
          }
        />
        {['classes', 'packages', 'payment-result'].map((path) => <Route key={path} path={'/receptionist/members/:id/' + path}
          element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}><ReceptionistRegistrationPage type={path} /></ProtectedRoute>} />)}
        <Route path="/receptionist/members/:id/checkout/:serviceType/:serviceId"
          element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}><ReceptionistCheckout /></ProtectedRoute>} />
        <Route
          path="/coach"
          element={
            <ProtectedRoute allowedRoles={[ROLES.COACH]}>
              <CoachDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach/classes"
          element={
            <ProtectedRoute allowedRoles={[ROLES.COACH]}>
              <CoachClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach/classes/:classId"
          element={
            <ProtectedRoute allowedRoles={[ROLES.COACH]}>
              <CoachClassDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/center-manager"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER, ROLES.ADMIN]}>
              <CenterManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/center-manager/finances" element={
          <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER, ROLES.ADMIN]}><CenterManagerFinance /></ProtectedRoute>
        } />
        <Route
          path="/center-manager/users"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER, ROLES.ADMIN]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/center-manager/audit-logs"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER, ROLES.ADMIN]}>
              <AuditLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/center-manager/classes"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER, ROLES.ADMIN]}>
              <ClassManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/center-manager/rooms"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER, ROLES.ADMIN]}>
              <RoomManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/center-manager/packages"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER, ROLES.ADMIN]}>
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
      </Suspense>
    </BrowserRouter>
  )
}

export default App
