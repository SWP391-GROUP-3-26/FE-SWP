import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ReceptionistLayout from '../components/ReceptionistLayout'
import ReceptionistMemberAvatar from '../components/ReceptionistMemberAvatar'
import MemberRequestError from '../components/MemberRequestError'
import { searchMembers } from '../services/memberService'
import useMemberRequest from '../hooks/useMemberRequest'
import './ReceptionistMembers.css'

export default function ReceptionistDashboard() {
  const [params, setParams] = useSearchParams()
  const keyword = params.get('keyword') || ''
  const pageParam = Number(params.get('page'))
  const page = Number.isInteger(pageParam) && pageParam >= 0 && pageParam <= 2147483647 ? pageParam : 0
  const request = useCallback((signal) => searchMembers(keyword, page, signal), [keyword, page])
  const { data, loading, error, retry } = useMemberRequest(request, Boolean(keyword.trim()), 350)

  function updateSearch(value, nextPage = 0) {
    const next = new URLSearchParams(params)
    if (value) next.set('keyword', value)
    else next.delete('keyword')
    if (nextPage) next.set('page', String(nextPage))
    else next.delete('page')
    setParams(next, { replace: true })
  }

  return (
    <ReceptionistLayout className="receptionist-dashboard-page">
      <section className="receptionist-hero" aria-labelledby="member-search-title">
        <span className="receptionist-eyebrow">UNI SPORTS · DỊCH VỤ HỘI VIÊN</span>
        <h1 id="member-search-title">Chào mừng, tiếp đón hội viên</h1>
        <p>Tìm nhanh hồ sơ hoặc bắt đầu đăng ký thành viên mới tại quầy.</p>
        <form className="receptionist-quick-search" onSubmit={(event) => event.preventDefault()}>
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input aria-label="Tìm hội viên" type="search" value={keyword}
            placeholder="Tìm theo tên, tài khoản, email hoặc số điện thoại"
            onChange={(event) => updateSearch(event.target.value)} />
          <Link className="receptionist-primary-button" to={`/receptionist/members?keyword=${encodeURIComponent(keyword)}`}>Tra cứu hội viên <span aria-hidden="true">→</span></Link>
        </form>
        <div className="member-booking-actions">
          <Link className="receptionist-secondary-button" to="/receptionist/members/new"><span className="material-symbols-outlined" aria-hidden="true">person_add</span> Đăng ký thành viên mới</Link>
        </div>
        <div role="status" aria-live="polite">
          {loading && <p className="receptionist-search-status">Đang tìm hội viên…</p>}
          {data && <p>{data.total === 0 ? 'Không tìm thấy học viên phù hợp.' : `Tìm thấy ${data.total} học viên.`}</p>}
        </div>
        {error && <MemberRequestError error={error} retry={retry} />}
        {data && <>
          <ul className="member-results receptionist-quick-results" aria-label="Kết quả tìm hội viên">
            {data.data.map((member) => (
              <li key={member.userId}>
                <Link className="member-result" to={`/receptionist/members/${member.userId}?${params.toString()}`}>
                  <span className="member-result-heading receptionist-result-person"><ReceptionistMemberAvatar member={member} size="small" /><strong>{member.fullName || '—'}</strong><span>{member.status || '—'}</span></span>
                  <span>Username: {member.username || '—'}</span>
                  <span>Email: {member.email || '—'}</span>
                  <span>Điện thoại: {member.phone || '—'}</span>
                  <span className="member-open">Xem hồ sơ <span aria-hidden="true">→</span></span>
                </Link>
              </li>
            ))}
          </ul>
          {data.total > 0 && data.data.length === 0 && <p>Trang này không còn kết quả. Hãy quay về trang trước.</p>}
          {(data.total > data.size || data.page > 0) && <nav className="member-pagination" aria-label="Phân trang học viên">
            <button className="member-button" type="button" disabled={data.page === 0} onClick={() => updateSearch(keyword, data.page - 1)}>Trang trước</button>
            <span>Trang {data.page + 1} / {Math.max(1, Math.ceil(data.total / data.size))}</span>
            <button className="member-button" type="button" disabled={(data.page + 1) * data.size >= data.total} onClick={() => updateSearch(keyword, data.page + 1)}>Trang sau</button>
          </nav>}
        </>}
      </section>
    </ReceptionistLayout>
  )
}
