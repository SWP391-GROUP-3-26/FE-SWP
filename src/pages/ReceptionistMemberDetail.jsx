import { useCallback } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import MemberRequestError from '../components/MemberRequestError'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'
import { getMemberById } from '../services/memberService'
import useMemberRequest from '../hooks/useMemberRequest'
import './ReceptionistMembers.css'

export default function ReceptionistMemberDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const request = useCallback((signal) => getMemberById(id, signal), [id])
  const { data: member, loading, error, retry } = useMemberRequest(request)
  return (
    <DashboardLayout
      eyebrow="Cổng tiếp tân / Hồ sơ học viên"
      menuItems={staffMenuItems[ROLES.RECEPTIONIST]}
      role="Receptionist"
      subtitle="Thông tin cá nhân của học viên."
      title="Thông tin học viên - Hồ sơ chi tiết"
    >
      <section className="dashboard-panel member-panel" aria-labelledby="member-detail-title">
        <Link className="back-link" to={`/receptionist?${params.toString()}`}>
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Quay lại tìm học viên
        </Link>
        <h3 id="member-detail-title">Hồ sơ học viên</h3>
        {loading && <p role="status">Đang tải hồ sơ…</p>}
        {error && <MemberRequestError error={error} retry={retry} isDetail />}
        {member && <dl className="member-details">
          {[
            ['Họ tên', member.fullName], ['Username', member.username],
            ['Email', member.email], ['Số điện thoại', member.phone],
            ['Ngày sinh', member.dob], ['Giới tính', member.gender],
            ['Địa chỉ', member.address], ['Vai trò', member.role], ['Trạng thái', member.status],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
        </dl>}
      </section>
    </DashboardLayout>
  )
}
