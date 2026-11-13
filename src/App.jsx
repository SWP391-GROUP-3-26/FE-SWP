import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import ProtectedRoute from './components/common/ProtectedRoute'
import LocalizationBridge from './components/common/LocalizationBridge'
import { ROLES } from './auth/roleConfig'
const CenterManagerDashboard = lazy(() => import('./pages/centerManager/CenterManagerDashboard'))
const CenterManagerFinance = lazy(() => import('./pages/centerManager/CenterManagerFinance'))
const AuditLog = lazy(() => import('./pages/centerManager/AuditLog'))
const ClassManagement = lazy(() => import('./pages/centerManager/ClassManagement'))
const RoomManagement = lazy(() => import('./pages/centerManager/RoomManagement'))
const CoachDashboard = lazy(() => import('./pages/coach/CoachDashboard'))
const CoachClasses = lazy(() => import('./pages/coach/CoachClasses'))
const CoachClassDetail = lazy(() => import('./pages/coach/CoachClassDetail'))
const CoachTrainingPlans = lazy(() => import('./pages/coach/CoachTrainingPlans'))
const MemberTrainingPlans = lazy(() => import('./pages/member/MemberTrainingPlans'))
const TrainingPlanDetail = lazy(() => import('./pages/shared/TrainingPlanDetail'))
const Landing = lazy(() => import('./pages/public/Landing'))
const GoogleCallback = lazy(() => import('./pages/public/GoogleCallback'))
const Login = lazy(() => import('./pages/public/Login'))
const MemberClasses = lazy(() => import('./pages/member/MemberClasses'))
const MemberDashboard = lazy(() => import('./pages/member/MemberDashboard'))
const MemberPackages = lazy(() => import('./pages/member/MemberPackages'))
const MemberPackageHistory = lazy(() => import('./pages/member/MemberPackageHistory'))
const MemberPaymentResult = lazy(() => import('./pages/member/MemberPaymentResult'))
const MemberPaymentHistory = lazy(() => import('./pages/member/MemberPaymentHistory'))
const StaffRefunds = lazy(() => import('./pages/shared/StaffRefunds'))
const MemberProfile = lazy(() => import('./pages/member/MemberProfile'))
const MemberSchedule = lazy(() => import('./pages/member/MemberSchedule'))
const PackageManagement = lazy(() => import('./pages/centerManager/PackageManagement'))
const ReceptionistDashboard = lazy(() => import('./pages/receptionist/ReceptionistDashboard'))
const ReceptionistMemberDetail = lazy(() => import('./pages/receptionist/ReceptionistMemberDetail'))
const ReceptionistMemberRegister = lazy(() => import('./pages/receptionist/ReceptionistMemberRegister'))
const ReceptionistMemberSearch = lazy(() => import('./pages/receptionist/ReceptionistMemberSearch'))
const ReceptionistRegistrationPage = lazy(() => import('./pages/receptionist/ReceptionistRegistrationPage'))
const ReceptionistCheckout = lazy(() => import('./pages/receptionist/ReceptionistCheckout'))
const Register = lazy(() => import('./pages/public/Register'))
const SubjectManagement = lazy(() => import('./pages/shared/SubjectManagement'))
const UserManagement = lazy(() => import('./pages/centerManager/UserManagement'))

const MemberChat = lazy(() => import('./pages/member/MemberChat'))

function App() {
  return (
    <BrowserRouter>
      <LocalizationBridge />
      <Suspense fallback={<div className="app-route-loading" role="status">Đang tải trang…</div>}>
      <Routes>
        <Route path="/member/payment-history" element={<ProtectedRoute allowedRoles={[ROLES.MEMBER]}><MemberPaymentHistory /></ProtectedRoute>} />
        <Route path="/member/payment-history/:id" element={<ProtectedRoute allowedRoles={[ROLES.MEMBER]}><MemberPaymentHistory /></ProtectedRoute>} />
        <Route path="/center-manager/refunds" element={<ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER]}><StaffRefunds /></ProtectedRoute>} />
        <Route path="/center-manager/refunds/:id" element={<ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER]}><StaffRefunds /></ProtectedRoute>} />
        <Route path="/receptionist/refunds" element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}><StaffRefunds audience="receptionist" /></ProtectedRoute>} />
        <Route path="/receptionist/refunds/:id" element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}><StaffRefunds audience="receptionist" /></ProtectedRoute>} />
        <Route path="/coach/training-plans" element={<ProtectedRoute allowedRoles={[ROLES.COACH]}><CoachTrainingPlans /></ProtectedRoute>} />
        <Route path="/coach/training-plans/:id" element={<ProtectedRoute allowedRoles={[ROLES.COACH]}><TrainingPlanDetail audience="coach" /></ProtectedRoute>} />
        <Route path="/member/training-plans" element={<ProtectedRoute allowedRoles={[ROLES.MEMBER]}><MemberTrainingPlans /></ProtectedRoute>} />
        <Route path="/member/training-plans/:id" element={<ProtectedRoute allowedRoles={[ROLES.MEMBER]}><TrainingPlanDetail /></ProtectedRoute>} />
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
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
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER]}>
              <CenterManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/center-manager/finances" element={
          <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER]}><CenterManagerFinance /></ProtectedRoute>
        } />
        <Route
          path="/center-manager/users"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/center-manager/audit-logs"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER]}>
              <AuditLog />
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
          path="/center-manager/rooms"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CENTER_MANAGER]}>
              <RoomManagement />
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
      </Suspense>
    </BrowserRouter>
  )
}

export default App
