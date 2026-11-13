import DashboardLayout from '../../layouts/DashboardLayout'
import { getAuth } from '../../auth/authStorage'
import memberMenuItems from '../../layouts/memberMenuItems'
import MemberTrainingPlanOverview from '../../components/member/MemberTrainingPlanOverview'
import MemberRefundNotifications from '../../components/member/MemberRefundNotifications'
import MemberUpcomingSchedule from '../../components/member/MemberUpcomingSchedule'
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
        </div>
        <span className="member-welcome-icon material-symbols-outlined" aria-hidden="true">spa</span>
      </section>

      <MemberTrainingPlanOverview />
      <MemberRefundNotifications />
      <MemberUpcomingSchedule />
    </DashboardLayout>
  )
}
