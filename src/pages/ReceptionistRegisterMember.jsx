import DashboardLayout from '../components/DashboardLayout'
import RegistrationForm from '../components/RegistrationForm'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'
import { registerMember } from '../services/registrationService'

export default function ReceptionistRegisterMember() {
  return (
    <DashboardLayout
      eyebrow="Cổng tiếp tân / Đăng ký người dùng"
      menuItems={staffMenuItems[ROLES.RECEPTIONIST]}
      role={ROLES.RECEPTIONIST}
      title="Đăng ký người dùng mới"
      subtitle="Nhập thông tin khách hàng để tạo tài khoản hội viên."
    >
      <section className="dashboard-panel">
        <RegistrationForm submitRegistration={registerMember} showTermsAgreement={false} />
      </section>
    </DashboardLayout>
  )
}
