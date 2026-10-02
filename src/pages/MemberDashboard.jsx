import DashboardLayout from '../components/DashboardLayout'

const menuItems = [
  { icon: 'home', label: 'Trang chu hoi vien', route: '/member' },
  { icon: 'calendar_month', label: 'Lich tap', route: '/member' },
  { icon: 'card_membership', label: 'Goi tap', route: '/member' },
  { icon: 'person', label: 'Ho so', route: '/member' },
]

export default function MemberDashboard() {
  return (
    <DashboardLayout
      eyebrow="Cong hoi vien / Trang chu"
      menuItems={menuItems}
      role="Member"
      subtitle="Khung tong quan cho hoi vien sau khi dang nhap thanh cong."
      title="Trang chu hoi vien"
    >
      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-card-accent">
          <span className="material-symbols-outlined">calendar_month</span>
          <h3>Lich tap</h3>
          <p>Placeholder cho lich tap va lop da dang ky.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">card_membership</span>
          <h3>Goi dich vu</h3>
          <p>Khung hien thi thong tin goi tap khi co API nghiep vu.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">person</span>
          <h3>Ho so</h3>
          <p>Khu vuc thong tin ca nhan cua hoi vien.</p>
        </article>
      </div>
      <section className="dashboard-panel">
        <h3>Noi dung hoi vien</h3>
        <div className="placeholder-box">Chua implement nghiep vu hoi vien.</div>
      </section>
    </DashboardLayout>
  )
}
