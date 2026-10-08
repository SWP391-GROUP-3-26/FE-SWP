import DashboardLayout from '../components/DashboardLayout'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'

export default function CenterManagerDashboard() {
  return (
    <DashboardLayout
      eyebrow="Quản trị trung tâm / Tổng quan"
      menuItems={staffMenuItems[ROLES.CENTER_MANAGER]}
      role="Center Manager"
      roleLabel="Quản lý trung tâm"
      subtitle="Tổng quan hoạt động trung tâm. Dữ liệu nghiệp vụ sẽ được hiển thị khi các API tương ứng sẵn sàng."
      title="Tổng quan quản trị trung tâm"
    >
      <div className="dashboard-grid manager-summary">
        <article className="dashboard-card dashboard-card-accent">
          <span className="material-symbols-outlined">monitoring</span>
          <h3>Vận hành</h3>
          <p>Khu vực tổng hợp các chỉ số hoạt động của trung tâm.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">groups</span>
          <h3>Nhân sự</h3>
          <p>Khu vực tổng hợp nhân sự và lịch trực.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">paid</span>
          <h3>Doanh thu</h3>
          <p>Báo cáo doanh thu sẽ hiển thị khi API được cung cấp.</p>
        </article>
      </div>
      <section className="dashboard-panel">
        <div className="panel-heading">
          <h3>Khu vực nội dung</h3>
          <span>Giao diện</span>
        </div>
        <div className="placeholder-box">Chức năng quản trị sẽ được cập nhật tại đây.</div>
      </section>
    </DashboardLayout>
  )
}
