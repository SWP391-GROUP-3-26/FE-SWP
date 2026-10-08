import { Link, Navigate } from 'react-router-dom'
import { clearAuth, getAccessToken, getRole } from '../auth/authStorage'
import { getRouteForRole, isAllowedRole } from '../auth/roleConfig'

export default function ProtectedRoute({ allowedRoles, children }) {
  const accessToken = getAccessToken()
  const role = getRole()

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (!isAllowedRole(role, allowedRoles)) {
    const roleRoute = getRouteForRole(role)
    if (roleRoute !== '/') return <Navigate to={roleRoute} replace />

    return (
      <main className="auth-page">
        <section className="auth-card" role="alert">
          <div className="auth-heading">
            <span className="auth-logo material-symbols-outlined" aria-hidden="true">lock</span>
            <h1>Không thể mở trang này</h1>
            <p>Vai trò trong phiên đăng nhập không khớp với quyền của trang. Vui lòng đăng nhập lại hoặc liên hệ quản trị viên để kiểm tra quyền tài khoản.</p>
            {role && <p>Vai trò hiện tại: <strong>{role}</strong></p>}
          </div>
          <div className="subject-modal-actions">
            <Link className="subject-button" to="/" onClick={clearAuth}>Đăng xuất</Link>
            <Link className="subject-button subject-primary" to="/login" onClick={clearAuth}>Đăng nhập lại</Link>
          </div>
        </section>
      </main>
    )
  }

  return children
}
