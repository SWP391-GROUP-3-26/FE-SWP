import { useCallback, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ReceptionistLayout from '../components/ReceptionistLayout'
import ReceptionistMemberAvatar from '../components/ReceptionistMemberAvatar'
import MemberRequestError from '../components/MemberRequestError'
import { getMemberById } from '../services/memberService'
import useMemberRequest from '../hooks/useMemberRequest'
import { formatClassDate } from '../utils/classSchedule'
import './ReceptionistMembers.css'
import './MemberActivities.css'
import ReceptionistRegistrations from '../components/ReceptionistRegistrations'
import PackageRenewalModal from '../components/PackageRenewalModal'
import './MemberPackages.css'

export default function ReceptionistMemberDetail() {
  const { id } = useParams()
  const [renewalPackage, setRenewalPackage] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [params] = useSearchParams()
  const request = useCallback((signal) => getMemberById(id, signal), [id])
  const { data: member, loading, error, retry } = useMemberRequest(request)
  return (
    <ReceptionistLayout className="receptionist-member-detail-page">
      <section className="dashboard-panel member-panel" aria-labelledby="member-detail-title">
        <Link className="back-link" to={`/receptionist?${params.toString()}`}>
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Quay lại tìm học viên
        </Link>
        <h3 id="member-detail-title">Hồ sơ hội viên</h3>
        {successMessage && <p className="member-registration-success" role="status">{successMessage}</p>}
        {loading && <p role="status">Đang tải hồ sơ…</p>}
        {error && <MemberRequestError error={error} retry={retry} isDetail />}
        {member && <>
          <section className="receptionist-member-summary">
            <ReceptionistMemberAvatar member={member} size="large" />
            <div><span className="receptionist-eyebrow">HỒ SƠ HỘI VIÊN</span><h1>{member.fullName || 'Chưa cập nhật'}</h1>
              <p>Mã hội viên: {member.userId} <span className={`receptionist-status ${member.status === 'Active' ? 'is-active' : ''}`}>{member.status === 'Active' ? 'Đang hoạt động' : member.status}</span></p></div>
            <div className="receptionist-member-actions">
            <Link className="member-register-button" to={`/receptionist/members/${id}/classes`}>Đăng ký lớp</Link>
            <Link className="member-register-button" to={`/receptionist/members/${id}/packages`}>Đăng ký gói</Link>
            </div>
          </section>
          <dl className="member-details">
          {[
            ['Tên đăng nhập', member.username],
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
                    <div><dt>Số buổi còn lại</dt><dd>{pack.remainingClasses ?? '—'}</dd></div>
                  </dl>
                  <button className="member-register-button" type="button" disabled={member.status !== 'Active'}
                    onClick={() => setRenewalPackage(pack)}>Gia hạn gói</button>
                </li>)}
              </ul>}
          </section>
          <ReceptionistRegistrations key={id} member={member} onChanged={retry} />
        </>}
      </section>
      {member && renewalPackage && <PackageRenewalModal key={`${id}/${renewalPackage.subscriptionId}`} memberId={id}
        expectedSubscriptionId={renewalPackage.subscriptionId} onClose={() => setRenewalPackage(null)} onSuccess={() => {
          setRenewalPackage(null)
          setSuccessMessage('Gia hạn gói tập thành công.')
          retry()
        }} />}
    </ReceptionistLayout>
  )
}
