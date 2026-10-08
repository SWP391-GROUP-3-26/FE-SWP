import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clearAuth } from '../auth/authStorage'
import memberPlant from '../assets/member-plant.svg'

export default function Sidebar({ role, menuItems }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeIndex = menuItems.findIndex((item) => item.route === pathname)

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  return (
    <aside className="dashboard-sidebar">
      <Link to="/" className="dashboard-brand">
        <span className="brand-mark material-symbols-outlined">spa</span>
        <span>
          <strong>{role === 'Hội viên' ? 'UniSports' : 'SereneDesk'}</strong>
          <small>{role}</small>
        </span>
      </Link>

      <nav className="dashboard-nav" aria-label={`${role} navigation`}>
        {menuItems.map((item, index) => (
          <Link
            className={`dashboard-nav-item${index === activeIndex ? ' dashboard-nav-item-active' : ''}`}
            aria-current={index === activeIndex ? 'page' : undefined}
            key={item.label}
            to={item.route}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {role === 'Hội viên' && (
        <img className="sidebar-plant-art" src={memberPlant} alt="" aria-hidden="true" />
      )}

      <button className="logout-button" onClick={handleLogout} type="button">
        <span className="material-symbols-outlined">logout</span>
        Đăng xuất
      </button>
    </aside>
  )
}
