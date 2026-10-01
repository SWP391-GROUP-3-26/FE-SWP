import { Link, useNavigate } from 'react-router-dom'

const navItems = [
  { icon: 'calendar_today', label: 'Lich' },
  { icon: 'desktop_windows', label: 'Goi dich vu' },
  { icon: 'fitness_center', label: 'Lop hoc' },
  { icon: 'person', label: 'Ho so ca nhan' },
]

export default function Dashboard() {
  const navigate = useNavigate()

  const handleLogout = () => {
    navigate('/login')
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link to="/dashboard" className="dashboard-brand">
          <span className="brand-mark material-symbols-outlined">spa</span>
          <span>
            <strong>SereneDesk</strong>
            <small>Wellness Center</small>
          </span>
        </Link>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <button className="dashboard-nav-item" key={item.label} type="button">
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button className="logout-button" onClick={handleLogout} type="button">
          <span className="material-symbols-outlined">logout</span>
          Dang xuat
        </button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="breadcrumb">Cong hoi vien / Tong quan</span>
          </div>
          <div className="topbar-user">
            <button className="notification-button" type="button">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="user-copy">
              <strong>Xin chao, Le Hoang Yen</strong>
              <small>Hoc vien</small>
            </div>
            <span className="user-avatar material-symbols-outlined">person</span>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="welcome-panel">
            <span className="welcome-icon material-symbols-outlined">waving_hand</span>
            <p>SereneDesk</p>
            <h1>Welcome back</h1>
            <span>
              Trang nay dung de test luong dang nhap, dang ky va dang xuat.
            </span>
          </section>
        </main>
      </div>
    </div>
  )
}
