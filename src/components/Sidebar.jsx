import { Link, useNavigate } from 'react-router-dom'
import { clearAuth } from '../auth/authStorage'

export default function Sidebar({ role, menuItems }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  return (
    <aside className="dashboard-sidebar">
      <Link to="/" className="dashboard-brand">
        <span className="brand-mark material-symbols-outlined">spa</span>
        <span>
          <strong>SereneDesk</strong>
          <small>{role}</small>
        </span>
      </Link>

      <nav className="dashboard-nav" aria-label={`${role} navigation`}>
        {menuItems.map((item, index) => (
          <Link
            className={`dashboard-nav-item${index === 0 ? ' dashboard-nav-item-active' : ''}`}
            key={item.label}
            to={item.route}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <button className="logout-button" onClick={handleLogout} type="button">
        <span className="material-symbols-outlined">logout</span>
        Dang xuat
      </button>
    </aside>
  )
}
