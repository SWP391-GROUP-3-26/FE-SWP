import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import MemberRequestError from '../components/MemberRequestError'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'
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
    <DashboardLayout
      eyebrow="Cổng tiếp tân / Trang chủ"
      menuItems={staffMenuItems[ROLES.RECEPTIONIST]}
      role="Receptionist"
      subtitle="Tìm học viên và mở hồ sơ ngay tại cổng tiếp tân."
      title="Trang chủ - Cổng tiếp tân"
    >
      <section className="dashboard-panel member-panel" aria-labelledby="member-search-title">
        <h3 id="member-search-title">Tìm học viên</h3>
        <label htmlFor="member-search">Tên, username, email hoặc số điện thoại</label>
        <div className="input-wrap">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input id="member-search" type="search" value={keyword}
            placeholder="Nhập tên, username, email hoặc số điện thoại"
            aria-describedby="member-search-help" autoComplete="off"
            onChange={(event) => updateSearch(event.target.value)} />
        </div>
        <p id="member-search-help" className="member-muted">Tìm theo một phần thông tin, không phân biệt chữ hoa và chữ thường.</p>
        <div role="status" aria-live="polite">
          {!keyword.trim() && <p className="placeholder-box">Nhập từ khóa để tìm học viên.</p>}
          {loading && <p>Đang tìm học viên…</p>}
          {data && <p>{data.total === 0 ? 'Không tìm thấy học viên phù hợp.' : `Tìm thấy ${data.total} học viên.`}</p>}
        </div>
        {error && <MemberRequestError error={error} retry={retry} />}
        {data && <>
          <ul className="member-results" aria-label="Kết quả tìm học viên">
            {data.data.map((member) => (
              <li key={member.userId}>
                <Link className="member-result" to={`/receptionist/members/${member.userId}?${params.toString()}`}>
                  <span className="member-result-heading"><strong>{member.fullName || '—'}</strong><span>{member.status || '—'}</span></span>
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
    </DashboardLayout>
  )
}
