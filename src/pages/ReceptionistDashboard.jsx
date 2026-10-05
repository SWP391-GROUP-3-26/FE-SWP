import DashboardLayout from '../components/DashboardLayout'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'

export default function ReceptionistDashboard() {
  return (
    <DashboardLayout
      eyebrow="Cong tiep tan / Trang chu"
      menuItems={staffMenuItems[ROLES.RECEPTIONIST]}
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
