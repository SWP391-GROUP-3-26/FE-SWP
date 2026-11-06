import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clearAuth } from '../auth/authStorage'
import { getRouteForRole, ROLES } from '../auth/roleConfig'
import memberPlant from '../assets/member-plant.svg'

export default function Sidebar({ role, menuItems, onCollapse }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeIndex = menuItems.findIndex((item) => item.route === pathname)
  const initialOpenGroup = menuItems.findIndex((item) =>
    item.children?.some((child) => child.route === pathname))
  const [openGroup, setOpenGroup] = useState(initialOpenGroup)
  const roleLabels = {
    'Center Manager': 'Quản lý trung tâm',
    Coach: 'Huấn luyện viên',
    Receptionist: 'Tiếp tân',
  }
  const roleLabel = roleLabels[role] || role
  const dashboardRoute = getRouteForRole(role === 'Hội viên' ? ROLES.MEMBER : role)

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  return (
    <aside className="dashboard-sidebar" id="dashboard-sidebar">
      <div className="dashboard-sidebar-heading">
        <Link
          to={dashboardRoute}
          className="dashboard-brand"
          aria-label={`UniSports — về trang chính ${roleLabel}`}
          title={`Về trang chính ${roleLabel}`}
        >
          <span className="brand-mark material-symbols-outlined">spa</span>
          <span className="dashboard-brand-copy">
            <strong>UniSports</strong>
            <small>{roleLabel}</small>
          </span>
        </Link>
        <button
          aria-controls="dashboard-sidebar"
          aria-expanded="true"
          aria-label="Ẩn thanh điều hướng"
          className="sidebar-toggle-button"
          onClick={onCollapse}
          title="Ẩn thanh điều hướng"
          type="button"
        >
          <span className="material-symbols-outlined" aria-hidden="true">left_panel_close</span>
        </button>
      </div>

      <nav className="dashboard-nav" aria-label={`Điều hướng ${roleLabel}`}>
        {menuItems.map((item, index) => {
          if (item.children) {
            const groupActive = item.children.some((child) => child.route === pathname)
            const expanded = openGroup === index
            return (
              <div className="dashboard-nav-group" key={item.label}>
                <button
                  aria-expanded={expanded}
                  className={`dashboard-nav-item dashboard-nav-group-toggle${groupActive ? ' dashboard-nav-item-active' : ''}`}
                  onClick={() => setOpenGroup(expanded ? -1 : index)}
                  type="button"
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="dashboard-nav-label">{item.label}</span>
                  <span className="material-symbols-outlined dashboard-nav-chevron" aria-hidden="true">
                    {expanded ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {expanded && (
                  <div className="dashboard-nav-children">
                    {item.children.map((child) => {
                      const active = child.route === pathname
                      return (
                        <Link
                          aria-current={active ? 'page' : undefined}
                          className={`dashboard-nav-item dashboard-nav-child${active ? ' dashboard-nav-item-active' : ''}`}
                          key={child.route}
                          to={child.route}
                        >
                          <span className="material-symbols-outlined">{child.icon}</span>
                          <span className="dashboard-nav-label">{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }
          if (item.disabled) {
            return (
              <span
                aria-disabled="true"
                className="dashboard-nav-item dashboard-nav-item-disabled"
                key={item.label}
                title="Chức năng chưa được kết nối với Backend"
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="dashboard-nav-label">{item.label}</span>
              </span>
            )
          }
          return (
            <Link
              className={`dashboard-nav-item${index === activeIndex ? ' dashboard-nav-item-active' : ''}`}
              aria-current={index === activeIndex ? 'page' : undefined}
              key={item.label}
              to={item.route}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="dashboard-nav-label">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="dashboard-sidebar-utility">
        <button aria-label="Đăng xuất" className="logout-button" onClick={handleLogout} type="button">
          <span className="material-symbols-outlined">logout</span>
          <span>Đăng xuất</span>
        </button>
        <img className="sidebar-plant-art" src={memberPlant} alt="" aria-hidden="true" />
      </div>

    </aside>
  )
}
