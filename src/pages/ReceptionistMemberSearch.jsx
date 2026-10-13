import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import Modal from '../components/Modal'
import { staffMenuItems } from '../components/staffMenuItems'
import { clearAuth } from '../auth/authStorage'
import { ROLES } from '../auth/roleConfig'
import { getReceptionistMemberById, receptionistMemberReadError, searchReceptionistMembers } from '../services/receptionistMemberService'
import { resolveAvatarUrl } from '../services/memberProfileService'
import './SubjectManagement.css'
import './ReceptionistMemberSearch.css'

const PAGE_SIZE = 20
const PROFILE_FIELDS = [
  ['userId', 'ID'], ['fullName', 'Họ và tên'], ['username', 'Tên đăng nhập'],
  ['email', 'Email'], ['phone', 'Số điện thoại'], ['dob', 'Ngày sinh'],
  ['gender', 'Giới tính'], ['address', 'Địa chỉ'], ['role', 'Vai trò'], ['status', 'Trạng thái'],
]

function ErrorNotice({ error, onRetry, onLogin }) {
  return (
    <div className="auth-error member-search-error" role="alert">
      <p>{error.message}</p>
      {error.requiresLogin && <button className="subject-button" onClick={onLogin} type="button">Đăng nhập lại</button>}
      {error.retryable && <button className="subject-button" onClick={onRetry} type="button">Thử lại</button>}
    </div>
  )
}

export default function ReceptionistMemberSearch() {
  const [keyword, setKeyword] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [failedAvatar, setFailedAvatar] = useState('')
  const searchController = useRef(null)
  const profileController = useRef(null)
  const searchInput = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    searchInput.current?.focus()
    const previousTitle = document.title
    document.title = 'Tìm kiếm thành viên - UniSports'
    return () => {
      searchController.current?.abort()
      profileController.current?.abort()
      document.title = previousTitle
    }
  }, [])

  function closeProfile() {
    profileController.current?.abort()
    profileController.current = null
    setSelectedId(null)
    setProfile(null)
    setProfileError(null)
    setProfileLoading(false)
    setFailedAvatar('')
  }

  function clearSearch() {
    searchController.current?.abort()
    searchController.current = null
    closeProfile()
    setKeyword('')
    setSubmittedSearch(null)
    setResult(null)
    setListError(null)
    setLoading(false)
    searchInput.current?.focus()
  }

  async function loadMembers(query, page = 0, size = PAGE_SIZE) {
    searchController.current?.abort()
    const controller = new AbortController()
    searchController.current = controller
    closeProfile()
    setSubmittedSearch({ keyword: query, page, size })
    setResult(null)
    setListError(null)
    setLoading(true)
    try {
      const response = await searchReceptionistMembers({ keyword: query, page, size }, controller.signal)
      if (!controller.signal.aborted && searchController.current === controller) setResult(response)
    } catch (error) {
      if (!controller.signal.aborted && searchController.current === controller && error.code !== 'ERR_CANCELED') {
        setListError(receptionistMemberReadError(error))
      }
    } finally {
      if (!controller.signal.aborted && searchController.current === controller) setLoading(false)
    }
  }

  function handleSearch(event) {
    event.preventDefault()
    const query = keyword.trim()
    if (!query) clearSearch()
    else void loadMembers(query)
  }

  async function loadProfile(userId) {
    profileController.current?.abort()
    const controller = new AbortController()
    profileController.current = controller
    setSelectedId(userId)
    setProfile(null)
    setProfileError(null)
    setFailedAvatar('')
    setProfileLoading(true)
    try {
      const response = await getReceptionistMemberById(userId, controller.signal)
      if (!controller.signal.aborted && profileController.current === controller) setProfile(response)
    } catch (error) {
      if (!controller.signal.aborted && profileController.current === controller && error.code !== 'ERR_CANCELED') {
        setProfileError(receptionistMemberReadError(error, 'detail'))
      }
    } finally {
      if (!controller.signal.aborted && profileController.current === controller) setProfileLoading(false)
    }
  }

  function loginAgain() {
    clearAuth()
    navigate('/login')
  }

  const totalPages = result ? Math.ceil(result.total / result.size) : 0
  const avatar = resolveAvatarUrl(profile?.avatarUrl)

  return (
    <DashboardLayout
      eyebrow="Cổng tiếp tân / Hội viên"
      menuItems={staffMenuItems[ROLES.RECEPTIONIST]}
      role={ROLES.RECEPTIONIST}
      roleLabel="Tiếp tân"
      title="Tìm kiếm thành viên"
      subtitle="Tìm theo một phần họ tên, tên đăng nhập, email hoặc số điện thoại, rồi chọn thành viên để xem hồ sơ."
    >
      <section className="dashboard-panel member-search-panel" aria-label="Tìm kiếm thành viên">
        <form className="member-search-toolbar" onSubmit={handleSearch}>
          <div className="member-search-query">
            <label htmlFor="member-keyword">Thông tin tìm kiếm</label>
            <div className="input-wrap">
              <input ref={searchInput} id="member-keyword" name="keyword" type="search" autoComplete="off"
                placeholder="Nhập họ tên, tên đăng nhập, email hoặc số điện thoại"
                value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            </div>
          </div>
          <button className="subject-button subject-primary" type="submit">Tìm kiếm</button>
          <button className="subject-button" onClick={clearSearch} type="button">Xóa tìm kiếm</button>
          <Link className="subject-button" to="/receptionist/members/new">Đăng ký thành viên</Link>
        </form>
        <div className="member-search-results" aria-busy={loading}>
          {loading && <p className="member-search-state" role="status">Đang tìm kiếm thành viên…</p>}
          {!loading && listError && <ErrorNotice error={listError} onLogin={loginAgain}
            onRetry={() => loadMembers(submittedSearch.keyword, submittedSearch.page, submittedSearch.size)} />}
          {!loading && !listError && !submittedSearch && <p className="member-search-state" role="status">Nhập thông tin để tìm thành viên</p>}
          {!loading && !listError && result && (
            <>
              <p className="member-search-count" role="status">Tìm thấy <strong>{result.total}</strong> kết quả cho “{submittedSearch.keyword}”.</p>
              {result.data.length === 0 ? (
                <p className="member-search-state">Không có kết quả trên trang này. Vui lòng kiểm tra từ khóa hoặc chọn trang khác.</p>
              ) : (
                <div className="subject-table-scroll" tabIndex={0} role="region" aria-label="Bảng kết quả thành viên">
                  <table className="subject-table member-search-table">
                    <caption className="visually-hidden">Kết quả tìm kiếm thành viên</caption>
                    <thead><tr>{['ID', 'Họ và tên', 'Tên đăng nhập', 'Email', 'Số điện thoại', 'Trạng thái', 'Thao tác'].map((title) => <th key={title} scope="col">{title}</th>)}</tr></thead>
                    <tbody>{result.data.map((member) => (
                      <tr key={member.userId}>
                        {[member.userId, member.fullName, member.username, member.email, member.phone, member.status].map((value, index) => <td key={index}>{value ?? 'Chưa cập nhật'}</td>)}
                        <td><button className="subject-button" type="button" onClick={() => loadProfile(member.userId)}
                          aria-label={`Xem hồ sơ thành viên ${member.fullName ?? member.username ?? member.userId}`}>Xem hồ sơ</button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              {totalPages > 0 && (
                <nav className="member-search-pagination" aria-label="Phân trang kết quả">
                  <button className="subject-button" disabled={result.page === 0} type="button"
                    onClick={() => loadMembers(submittedSearch.keyword, Math.min(result.page - 1, totalPages - 1), result.size)}>Trang trước</button>
                  <span>{result.page < totalPages ? `Trang ${result.page + 1} / ${totalPages}` : 'Trang hiện tại không còn kết quả'}</span>
                  <button className="subject-button" disabled={result.page + 1 >= totalPages} type="button"
                    onClick={() => loadMembers(submittedSearch.keyword, result.page + 1, result.size)}>Trang sau</button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
      {selectedId !== null && (
        <Modal title="Hồ sơ thành viên" onClose={closeProfile}>
          <div className="member-profile-content" aria-busy={profileLoading}>
            {profileLoading && <p className="member-search-state" role="status">Đang tải hồ sơ thành viên…</p>}
            {profileError && <ErrorNotice error={profileError} onLogin={loginAgain} onRetry={() => loadProfile(selectedId)} />}
            {profile && (
              <dl className="member-profile-details">
                <div className="member-search-profile-avatar"><dt>Ảnh đại diện</dt><dd>{profile.avatarUrl === null ? 'Chưa cập nhật' : (
                  avatar && failedAvatar !== avatar
                    ? <img src={avatar} alt="Ảnh đại diện thành viên" referrerPolicy="no-referrer" onError={() => setFailedAvatar(avatar)} />
                    : 'Không thể hiển thị ảnh đại diện.'
                )}</dd></div>
                {PROFILE_FIELDS.map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{profile[field] ?? 'Chưa cập nhật'}</dd></div>)}
              </dl>
            )}
          </div>
          <div className="subject-modal-actions"><button className="subject-button" type="button" onClick={closeProfile}>Đóng</button></div>
        </Modal>
      )}
    </DashboardLayout>
  )
}
