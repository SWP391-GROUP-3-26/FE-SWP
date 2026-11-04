import DashboardLayout from '../components/DashboardLayout'
import { Link } from 'react-router-dom'
import CenterManagerFinance from './CenterManagerFinance'
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
      className="center-manager-dashboard"
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
        <Link className="dashboard-card manager-finance-shortcut" to="/center-manager/finances">
          <span className="material-symbols-outlined">paid</span>
          <h3>Doanh thu</h3>
          <p>Xem báo cáo doanh thu theo tháng.</p>
        </Link>
      </div>
      <section className="dashboard-panel">
        <div className="panel-heading">
          <h3>Báo cáo tài chính</h3>
          <Link to="/center-manager/finances">Mở toàn trang</Link>
        </div>
        <CenterManagerFinance embedded />
      </section>
    </DashboardLayout>
  )
}
