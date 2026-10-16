import DashboardLayout from '../components/DashboardLayout'
import { Link } from 'react-router-dom'
import { getAuth } from '../auth/authStorage'
import memberMenuItems from '../components/memberMenuItems'
import './MemberDashboard.css'

export default function MemberDashboard() {
  const { fullName, username } = getAuth()
  const memberName = fullName || username || 'hội viên'

  return (
    <DashboardLayout
      eyebrow="Hội viên / Tổng quan"
      menuItems={memberMenuItems}
      role="Hội viên"
      showIntro={false}
      title="Tổng quan hội viên"
    >
      <section className="member-welcome-banner">
        <div className="member-welcome-copy">
          <span className="section-heading-kicker">UNISPORTS · WELLNESS CLUB</span>
          <h2>Chào mừng trở lại, {memberName}!</h2>
          <p>Mỗi buổi tập là một bước tiến gần hơn đến phiên bản khỏe mạnh hơn của bạn.</p>
        </div>
        <span className="member-welcome-icon material-symbols-outlined" aria-hidden="true">spa</span>
      </section>

      <div className="dashboard-grid member-overview-grid">
        <article className="dashboard-card dashboard-card-accent">
          <span className="material-symbols-outlined">calendar_month</span>
          <h3>Lịch tập</h3>
          <p>Xem các buổi học đã xác nhận theo từng tuần.</p>
          <Link className="member-profile-link" to="/member/schedule">Xem lịch tập</Link>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">card_membership</span>
          <h3>Gói tập</h3>
          <p>Theo dõi gói đang dùng, thời hạn và các gói đang mở bán.</p>
          <Link className="member-profile-link" to="/member/packages">Xem gói tập</Link>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">sports_gymnastics</span>
          <h3>Lớp học</h3>
          <p>Tìm lớp phù hợp hoặc xem lại các lớp đã đăng ký.</p>
          <Link className="member-profile-link" to="/member/classes">Xem lớp học</Link>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">person</span>
          <h3>Hồ sơ</h3>
          <p>Cập nhật thông tin liên hệ và ảnh đại diện của bạn.</p>
          <Link className="member-profile-link" to="/member/profile">Xem hồ sơ</Link>
        </article>
      </div>
    </DashboardLayout>
  )
}
