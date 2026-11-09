import { Link, useNavigate } from 'react-router-dom'
import { clearAuth, getAuth } from '../auth/authStorage'
import LanguageSwitcher from './LanguageSwitcher'
import LocalizedContent from './LocalizedContent'
import '../pages/ReceptionistExperience.css'
import './ReceptionistLayout.css'

export default function ReceptionistLayout({ children, className = '' }) {
  const navigate = useNavigate()
  const auth = getAuth()
  const displayName = auth.fullName || auth.username || 'Tiếp tân'

  function logout() {
    clearAuth()
    navigate('/', { replace: true })
  }

  return (
    <div className={`receptionist-shell ${className}`.trim()}>
      <LocalizedContent><header className="receptionist-topbar">
        <Link className="receptionist-brand" to="/receptionist" aria-label="UniSports — Cổng tiếp tân">
          <span className="material-symbols-outlined" aria-hidden="true">spa</span>
          <span><strong>UniSports</strong><small>Tiếp tân</small></span>
        </Link>
        <div className="receptionist-user">
          <button aria-label="Thông báo" className="receptionist-notification-button" title="Thông báo" type="button">
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
          </button>
          <LanguageSwitcher />
          <span><strong>{displayName}</strong><small>Tiếp tân</small></span>
          <span className="receptionist-user-avatar material-symbols-outlined" aria-hidden="true">person</span>
          <button onClick={logout} type="button">Đăng xuất</button>
        </div>
      </header></LocalizedContent>
      <main className="receptionist-main"><LocalizedContent>{children}</LocalizedContent></main>
    </div>
  )
}
