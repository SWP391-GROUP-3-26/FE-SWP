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

      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-card-accent">
          <span className="material-symbols-outlined">calendar_month</span>
          <h3>Lịch tập</h3>
          <p>Lịch tập và các lớp đã đăng ký sẽ hiển thị tại đây.</p>
          <Link className="member-profile-link" to="/member/schedule">Xem lịch tập</Link>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">card_membership</span>
          <h3>Gói tập</h3>
          <p>Thông tin gói tập sẽ hiển thị tại đây.</p>
          <Link className="member-profile-link" to="/member/packages">Xem gói tập</Link>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">sports_gymnastics</span>
          <h3>Lớp học</h3>
          <p>Khám phá các lớp tập và lịch học dành cho hội viên.</p>
          <Link className="member-profile-link" to="/member/classes">Xem lớp học</Link>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">person</span>
          <h3>Hồ sơ</h3>
          <p>Thông tin cá nhân của hội viên sẽ hiển thị tại đây.</p>
          <Link className="member-profile-link" to="/member/profile">Xem hồ sơ</Link>
        </article>
      </div>
      <section className="dashboard-panel member-journey-panel">
        <h3 className="member-activity-title">Hoạt động hội viên</h3>
        <div className="member-journey-heading">
          <span className="member-journey-icon material-symbols-outlined" aria-hidden="true">emoji_events</span>
          <div>
            <span className="section-heading-kicker">HÀNH TRÌNH SỨC KHỎE</span>
            <h3>Bắt đầu hành trình của bạn</h3>
            <p>Giữ thông tin cá nhân luôn mới để UniSports hỗ trợ bạn tốt hơn.</p>
          </div>
        </div>
        <div className="member-journey-footer">
          <span>
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
            Lịch tập và thông tin gói sẽ hiển thị khi được kết nối với hệ thống.
          </span>
          <Link to="/member/profile">Cập nhật thông tin <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
