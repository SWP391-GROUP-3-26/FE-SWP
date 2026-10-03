import DashboardLayout from '../components/DashboardLayout'

const menuItems = [
  { icon: 'home', label: 'Tổng quan', route: '/member' },
  { icon: 'calendar_month', label: 'Lịch tập', route: '/member' },
  { icon: 'card_membership', label: 'Gói tập', route: '/member' },
  { icon: 'person', label: 'Hồ sơ', route: '/member' },
]

export default function MemberDashboard() {
  return (
    <DashboardLayout
      eyebrow="Hội viên / Tổng quan"
      menuItems={menuItems}
      role="Hội viên"
      subtitle="Tổng quan hoạt động dành cho hội viên." 
      title="Tổng quan hội viên"
    >
      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-card-accent">
          <span className="material-symbols-outlined">calendar_month</span>
          <h3>Lịch tập</h3>
          <p>Lịch tập và các lớp đã đăng ký sẽ hiển thị tại đây.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">card_membership</span>
          <h3>Gói tập</h3>
          <p>Thông tin gói tập sẽ hiển thị tại đây.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">person</span>
          <h3>Hồ sơ</h3>
          <p>Thông tin cá nhân của hội viên sẽ hiển thị tại đây.</p>
        </article>
      </div>
      <section className="dashboard-panel">
        <h3>Hoạt động hội viên</h3>
        <div className="placeholder-box">Các tính năng dành cho hội viên đang được phát triển.</div>
      </section>
    </DashboardLayout>
  )
}
