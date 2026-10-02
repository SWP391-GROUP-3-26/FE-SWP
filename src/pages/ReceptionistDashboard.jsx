import DashboardLayout from '../components/DashboardLayout'

const menuItems = [
  { icon: 'home', label: 'Tong quan tiep tan', route: '/receptionist' },
  { icon: 'event_available', label: 'Lich hen', route: '/receptionist' },
  { icon: 'person_add', label: 'Hoi vien', route: '/receptionist' },
  { icon: 'payments', label: 'Thanh toan', route: '/receptionist' },
]

export default function ReceptionistDashboard() {
  return (
    <DashboardLayout
      eyebrow="Cong tiep tan / Trang chu"
      menuItems={menuItems}
      role="Receptionist"
      subtitle="Khung lam viec cho le tan theo doi lich hen, hoi vien va thanh toan."
      title="Trang chu - Cong tiep tan"
    >
      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-card-accent">
          <span className="material-symbols-outlined">event_available</span>
          <h3>Lich hen hom nay</h3>
          <p>Placeholder cho danh sach lich hen va check-in.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">person_add</span>
          <h3>Ho tro hoi vien</h3>
          <p>Khu vuc se gan voi nghiep vu hoi vien khi co API.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">receipt_long</span>
          <h3>Giao dich</h3>
          <p>Khung placeholder cho thu phi va bien lai.</p>
        </article>
      </div>
      <section className="dashboard-panel">
        <h3>Hang doi tiep tan</h3>
        <div className="placeholder-box">Noi dung nghiep vu se duoc tich hop sau.</div>
      </section>
    </DashboardLayout>
  )
}
