import { useCallback } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import MemberRequestError from '../components/MemberRequestError'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'
import { getMemberById } from '../services/memberService'
import useMemberRequest from '../hooks/useMemberRequest'
import { formatClassDate } from '../utils/classSchedule'
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
      subtitle="Thông tin cá nhân, gói tập và lớp đã đăng ký còn hạn của học viên."
      title="Thông tin học viên - Hồ sơ chi tiết"
    >
      <section className="dashboard-panel member-panel" aria-labelledby="member-detail-title">
        <Link className="back-link" to={`/receptionist?${params.toString()}`}>
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Quay lại tìm học viên
        </Link>
        <h3 id="member-detail-title">Hồ sơ học viên</h3>
        {loading && <p role="status">Đang tải hồ sơ…</p>}
        {error && <MemberRequestError error={error} retry={retry} isDetail />}
        {member && <><dl className="member-details">
          {[
            ['Họ tên', member.fullName], ['Username', member.username],
            ['Email', member.email], ['Số điện thoại', member.phone],
            ['Ngày sinh', member.dob], ['Giới tính', member.gender],
            ['Địa chỉ', member.address], ['Vai trò', member.role], ['Trạng thái', member.status],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
        </dl>
          <section className="member-enrollments" aria-labelledby="member-packages-title">
            <h3 id="member-packages-title">Gói tập còn hạn ({member.activePackages.length})</h3>
            {member.activePackages.length === 0 ? <p className="member-muted">Học viên chưa có gói tập còn hạn.</p>
              : <ul className="member-results">
                {member.activePackages.map((pack) => <li key={pack.subscriptionId} className="member-enrollment-card">
                  <h4>{pack.packageName}</h4>
                  <dl className="member-details">
                    <div><dt>Ngày bắt đầu</dt><dd>{formatClassDate(pack.startDate)}</dd></div>
                    <div><dt>Ngày hết hạn</dt><dd>{formatClassDate(pack.endDate)}</dd></div>
                    <div><dt>Số buổi trong gói</dt><dd>{pack.includedClasses ?? '—'}</dd></div>
                  </dl>
                </li>)}
              </ul>}
          </section>
          <section className="member-enrollments" aria-labelledby="member-classes-title">
            <h3 id="member-classes-title">Lớp đã đăng ký còn hạn ({member.activeClasses.length})</h3>
            {member.activeClasses.length === 0 ? <p className="member-muted">Học viên chưa có lớp đã đăng ký còn hạn.</p>
              : <ul className="member-results">
                {member.activeClasses.map((course) => <li key={course.classId} className="member-enrollment-card">
                  <h4>{course.className}</h4>
                  <dl className="member-details">
                    <div><dt>Bộ môn</dt><dd>{course.subjectName || '—'}</dd></div>
                    <div><dt>Huấn luyện viên</dt><dd>{course.coachName || '—'}</dd></div>
                    <div><dt>Phòng</dt><dd>{course.roomName || '—'}</dd></div>
                    <div><dt>Lịch học</dt><dd>{course.daysOfWeek || 'Theo lịch'}</dd></div>
                    <div><dt>Giờ học</dt><dd>{course.startTime?.slice(0, 5) || '—'} – {course.endTime?.slice(0, 5) || '—'}</dd></div>
                    <div><dt>Thời hạn</dt><dd>{formatClassDate(course.startDate)} – {formatClassDate(course.endDate)}</dd></div>
                  </dl>
                </li>)}
              </ul>}
          </section>
        </>}
      </section>
    </DashboardLayout>
  )
}
