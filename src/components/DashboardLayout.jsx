import { useEffect, useState } from 'react'
import { getAuth, getRole, updateAuthProfile } from '../auth/authStorage'
import {
  getMyProfile,
  profileErrorMessage,
  resolveAvatarUrl,
} from '../services/memberProfileService'
import Sidebar from './Sidebar'

export default function DashboardLayout({
  role,
  roleLabel = role,
  eyebrow,
  title,
  subtitle,
  menuItems,
  profile,
  showIntro = true,
  className = '',
  children,
}) {
  const [auth, setAuth] = useState(getAuth)
  const [failedAvatarSrc, setFailedAvatarSrc] = useState('')
  const [profileSyncError, setProfileSyncError] = useState('')
  const avatarSrc = resolveAvatarUrl(profile?.avatarUrl || auth.avatarUrl)

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
    <div className={`dashboard-shell ${className}`.trim()}>
      <Sidebar role={role} menuItems={menuItems} />

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="breadcrumb">{eyebrow}</span>
            <h1 className="dashboard-page-title">{title}</h1>
          </div>
          <div className="topbar-user">
            <button className="notification-button" type="button">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="user-copy">
              <strong>{profile?.fullName || auth.fullName || auth.username || role}</strong>
              <small>{roleLabel}</small>
              {profileSyncError && (
                <small role="status" title={profileSyncError}>
                  Không thể đồng bộ hồ sơ
                </small>
              )}
            </div>
            <span className="user-avatar">
              {showAvatar ? (
                <img
                  key={avatarSrc}
                  alt=""
                  onError={() => setFailedAvatarSrc(avatarSrc)}
                  referrerPolicy="no-referrer"
                  src={avatarSrc}
                />
              ) : (
                <span className="material-symbols-outlined" aria-hidden="true">person</span>
              )}
            </span>
          </div>
        </header>

        <main className="dashboard-content">
          {showIntro && (
            <section className="dashboard-intro">
              <div>
                <span className="section-heading-kicker">{roleLabel}</span>
                <h2>{title}</h2>
                <p>{subtitle}</p>
              </div>
            </section>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
