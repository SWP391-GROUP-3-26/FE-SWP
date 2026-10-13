import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'

export default function ReceptionistDashboard() {
  return (
    <DashboardLayout
      eyebrow="Cổng tiếp tân / Trang chủ"
      menuItems={staffMenuItems[ROLES.RECEPTIONIST]}
      role="Receptionist"
      roleLabel="Tiếp tân"
      subtitle="Không gian làm việc cho tiếp tân theo dõi lịch hẹn, hội viên và thanh toán."
      title="Trang chủ - Cổng tiếp tân"
    >
      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-card-accent">
          <span className="material-symbols-outlined">event_available</span>
          <h3>Lịch hẹn hôm nay</h3>
          <p>Danh sách lịch hẹn và điểm danh sẽ được tích hợp sau.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">person_add</span>
          <h3>Đăng ký thành viên mới</h3>
          <p>Tạo tài khoản thành viên cho khách tại quầy.</p>
          <Link className="primary-link" to="/receptionist/members/new">Đăng ký thành viên</Link>
          <Link className="ghost-link" to="/receptionist/members">Tìm kiếm thành viên</Link>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">receipt_long</span>
          <h3>Giao dịch</h3>
          <p>Chức năng thu phí và biên lai sẽ được tích hợp sau.</p>
        </article>
      </div>
      <section className="dashboard-panel">
        <h3>Hàng đợi tiếp tân</h3>
        <div className="placeholder-box">Nội dung nghiệp vụ sẽ được tích hợp sau.</div>
      </section>
    </DashboardLayout>
  )
}
