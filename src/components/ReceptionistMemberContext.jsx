import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getMemberById } from '../services/memberService'
import useMemberRequest from '../hooks/useMemberRequest'
import MemberRequestError from './MemberRequestError'

export default function ReceptionistMemberContext({ memberId }) {
  const request = useCallback((signal) => getMemberById(memberId, signal), [memberId])
  const { data, loading, error, retry } = useMemberRequest(request)
  return <aside className="member-policy-note receptionist-selected-member">
    <div>
      {loading && <p role="status">Đang tải hội viên…</p>}
      {error && <MemberRequestError error={error} retry={retry} isDetail />}
      {data && <strong>Đang thao tác cho: {data.fullName} · Mã hội viên #{data.userId}</strong>}
      <p><Link to={`/receptionist/members/${memberId}`}>Quay lại thông tin hội viên #{memberId}</Link></p>
    </div>
  </aside>
}
