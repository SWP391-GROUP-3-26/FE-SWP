import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuth, getRole, updateAuthProfile } from '../auth/authStorage'
import {
  getMyProfile,
  profileErrorMessage,
  resolveAvatarUrl,
} from '../services/memberProfileService'
import Sidebar from './Sidebar'
import LanguageSwitcher from './LanguageSwitcher'
import LocalizedContent from './LocalizedContent'

export default function DashboardLayout({
  role,
  roleLabel = role,
  eyebrow,
  title,
  menuItems,
  profile,
  showIntro = true,
  className = '',
  children,
}) {
  const [auth, setAuth] = useState(getAuth)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(`unisports:sidebar-collapsed:${role}`) === 'true'
    } catch {
      return false
    }
  })
  const [failedAvatarSrc, setFailedAvatarSrc] = useState('')
  const [profileSyncError, setProfileSyncError] = useState('')
  const isMember = getRole() === 'Member'
  const avatarSrc = resolveAvatarUrl(profile?.avatarUrl || auth.avatarUrl)

  useEffect(() => {
    try {
      window.localStorage.setItem(`unisports:sidebar-collapsed:${role}`, String(sidebarCollapsed))
    } catch {
      // Keep the control usable when browser storage is unavailable.
    }
  }, [role, sidebarCollapsed])

  useEffect(() => {
    if (getRole() !== 'Member') return undefined
    const controller = new AbortController()

    getMyProfile(controller.signal)
      .then((profile) => {
        if (controller.signal.aborted) return
        const updatedAuth = {
          fullName: profile.fullName,
          email: profile.email,
          status: profile.status,
          avatarUrl: profile.avatarUrl,
        }
        updateAuthProfile(updatedAuth)
        setAuth((current) => ({ ...current, ...updatedAuth }))
        setProfileSyncError('')
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setAuth(getAuth())
          setProfileSyncError(profileErrorMessage(error))
        }
      })

    return () => controller.abort()
  }, [])

  const showAvatar = avatarSrc && avatarSrc !== failedAvatarSrc

  return (
    <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell-sidebar-collapsed' : ''} ${className}`.trim()}>
      <Sidebar onCollapse={() => setSidebarCollapsed(true)} role={role} menuItems={menuItems} />

      <div className="dashboard-main">
        {sidebarCollapsed && (
          <button
            aria-controls="dashboard-sidebar"
            aria-expanded="false"
            aria-label="Mở rộng thanh điều hướng"
            className="sidebar-reopen-button"
            onClick={() => setSidebarCollapsed(false)}
            title="Mở rộng thanh điều hướng"
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true">left_panel_open</span>
          </button>
        )}
        <LocalizedContent><header className="dashboard-topbar">
          <div>
            {eyebrow && !['Hội viên', 'Member'].includes(role) && (
              <span className="breadcrumb">{eyebrow}</span>
            )}
            <h1 className="dashboard-page-title">{title}</h1>
          </div>
          <div className="topbar-user">
            <button aria-label="Thông báo" className="notification-button" title="Thông báo" type="button">
              <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
            </button>
            <LanguageSwitcher />
            <div className="user-copy">
              <strong>{profile?.fullName || auth.fullName || auth.username || role}</strong>
              <small>{roleLabel}</small>
              {profileSyncError && (
                <small role="status" title={profileSyncError}>
                  Không thể đồng bộ hồ sơ
                </small>
              )}
            </div>
            {isMember ? (
              <Link aria-label="Mở hồ sơ hội viên" className="user-avatar" title="Hồ sơ cá nhân" to="/member/profile">
                {showAvatar ? (
                  <img key={avatarSrc} alt="" onError={() => setFailedAvatarSrc(avatarSrc)}
                    referrerPolicy="no-referrer" src={avatarSrc} />
                ) : (
                  <span className="material-symbols-outlined" aria-hidden="true">person</span>
                )}
              </Link>
            ) : (
              <span className="user-avatar">
                {showAvatar ? (
                  <img key={avatarSrc} alt="" onError={() => setFailedAvatarSrc(avatarSrc)}
                    referrerPolicy="no-referrer" src={avatarSrc} />
                ) : (
                  <span className="material-symbols-outlined" aria-hidden="true">person</span>
                )}
              </span>
            )}
          </div>
        </header></LocalizedContent>

        <main className="dashboard-content">
          {showIntro && (
            <LocalizedContent>
              <section className="dashboard-intro">
                <div>
                  <span className="section-heading-kicker">{roleLabel}</span>
                  <h2>{title}</h2>
                </div>
              </section>
            </LocalizedContent>
          )}
          <LocalizedContent>{children}</LocalizedContent>
        </main>
      </div>
    </div>
  )
}
