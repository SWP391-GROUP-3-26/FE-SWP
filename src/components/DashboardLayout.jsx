import { getAuth } from '../auth/authStorage'
import Sidebar from './Sidebar'

export default function DashboardLayout({
  role,
  eyebrow,
  title,
  subtitle,
  menuItems,
  children,
}) {
  const { fullName, username } = getAuth()

  return (
    <div className="dashboard-shell">
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
              <strong>{fullName || username || role}</strong>
              <small>{role}</small>
            </div>
            <span className="user-avatar material-symbols-outlined">person</span>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="dashboard-intro">
            <div>
              <span className="section-heading-kicker">{role}</span>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
          </section>
          {children}
        </main>
      </div>
    </div>
  )
}
