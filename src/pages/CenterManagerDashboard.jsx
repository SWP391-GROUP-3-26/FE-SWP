import DashboardLayout from '../components/DashboardLayout'

const menuItems = [
  { icon: 'dashboard', label: 'Tong quan trung tam', route: '/center-manager' },
  { icon: 'analytics', label: 'Bao cao', route: '/center-manager' },
  { icon: 'groups', label: 'Nhan su', route: '/center-manager' },
  { icon: 'settings', label: 'Cau hinh', route: '/center-manager' },
]

export default function CenterManagerDashboard() {
  return (
    <DashboardLayout
      eyebrow="Quan tri trung tam / Dashboard"
      menuItems={menuItems}
      role="Center Manager"
      subtitle="Khung tong quan danh cho quan ly trung tam, chua gan API nghiep vu."
      title="Dashboard - Quan tri trung tam"
    >
      <div className="dashboard-grid manager-summary">
        <article className="dashboard-card dashboard-card-accent">
          <span className="material-symbols-outlined">monitoring</span>
          <h3>Van hanh</h3>
          <p>Placeholder cho chi so trung tam.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">groups</span>
          <h3>Nhan su</h3>
          <p>Khung tong hop nhan su va lich truc.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">paid</span>
          <h3>Doanh thu</h3>
          <p>Khung bao cao khi Backend cung cap API.</p>
        </article>
      </div>
      <section className="dashboard-panel">
        <div className="panel-heading">
          <h3>Khong gian noi dung</h3>
          <span>Shell only</span>
        </div>
        <div className="placeholder-box">Chua implement nghiep vu quan tri.</div>
      </section>
    </DashboardLayout>
  )
}
