import { useEffect, useRef, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import Modal from '../components/Modal'
import { staffMenuItems } from '../components/staffMenuItems'
import { getRole } from '../auth/authStorage'
import {
  getManagedUserById,
  getManagedUsers,
  getUserManagementOptions,
  updateManagedUserStatus,
} from '../services/userManagementService'
import './ServiceManagement.css'

const EMPTY_STATUS = ''
const EMPTY_ROLE = ''

export default function UserManagement() {
  const role = getRole()
  const [users, setUsers] = useState([])
  const [roleOptions, setRoleOptions] = useState(['Receptionist', 'Coach', 'Member'])
  const [statusOptions, setStatusOptions] = useState(['Active', 'Inactive', 'Locked'])
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState(EMPTY_STATUS)
  const [selectedRole, setSelectedRole] = useState(EMPTY_ROLE)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusUpdateError, setStatusUpdateError] = useState('')
  const [updatingUserIds, setUpdatingUserIds] = useState([])
  const [detailUser, setDetailUser] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const detailControllerRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    async function loadOptions() {
      try {
        const options = await getUserManagementOptions()
        if (!isMounted) return
        if (Array.isArray(options.roles) && options.roles.length) setRoleOptions(options.roles)
        if (Array.isArray(options.statuses) && options.statuses.length) setStatusOptions(options.statuses)
      } catch {
        if (!isMounted) return
      }
    }

    loadOptions()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => () => detailControllerRef.current?.abort(), [])

  useEffect(() => {
    let isMounted = true

    async function loadUsers() {
      setLoading(true)
      setError('')

      try {
        const response = await getManagedUsers({
          search,
          role: selectedRole,
          status: selectedStatus,
          page,
          size: 20,
        })

        if (!isMounted) return
        setUsers(response.users || [])
        setTotal(response.total || 0)
        setTotalPages(response.totalPages || 0)
      } catch (err) {
        if (!isMounted) return
        setUsers([])
        setError(err?.message || 'Không thể tải danh sách người dùng.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [search, selectedRole, selectedStatus, page])

  const roleTabs = ['Tất cả vai trò', ...roleOptions]

  const handleRoleChange = (label) => {
    setSelectedRole(label === 'Tất cả vai trò' ? EMPTY_ROLE : label)
    setPage(0)
  }

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value)
    setPage(0)
  }

  const handleSearchChange = (event) => {
    setSearch(event.target.value)
    setPage(0)
  }

  const handleRefresh = () => {
    setSearch('')
    setSelectedStatus(EMPTY_STATUS)
    setSelectedRole(EMPTY_ROLE)
    setPage(0)
  }

  const handleStatusToggle = async (user) => {
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active'
    if (user.status === 'Active') {
      const username = user.username || user.fullName || user.userId
      const confirmed = window.confirm(
        `Bạn có chắc muốn huỷ hoạt động của người này không "${username}"?`
      )
      if (!confirmed) return
    }

    setStatusUpdateError('')
    setUpdatingUserIds((current) => [...current, user.userId])

    try {
      const updatedUser = await updateManagedUserStatus(user.userId, nextStatus)
      setUsers((current) => current.map((item) =>
        item.userId === user.userId ? { ...item, ...updatedUser } : item
      ))
    } catch (err) {
      setStatusUpdateError(err?.message || 'Không thể cập nhật trạng thái người dùng.')
    } finally {
      setUpdatingUserIds((current) => current.filter((id) => id !== user.userId))
    }
  }

  const loadUserDetail = async (user) => {
    detailControllerRef.current?.abort()
    const controller = new AbortController()
    detailControllerRef.current = controller
    setDetailUser(user)
    setDetailLoading(true)
    setDetailError('')

    try {
      const detail = await getManagedUserById(user.userId, controller.signal)
      if (!controller.signal.aborted) setDetailUser(detail)
    } catch (err) {
      if (!controller.signal.aborted) {
        setDetailError(err?.message || 'Không thể tải thông tin người dùng.')
      }
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    detailControllerRef.current?.abort()
    detailControllerRef.current = null
    setDetailUser(null)
    setDetailLoading(false)
    setDetailError('')
  }

  const currentPage = totalPages > 0 ? Math.min(page + 1, totalPages) : 1
  const detailInitials = (detailUser?.fullName || detailUser?.username || '?')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return (
    <DashboardLayout role={role} menuItems={staffMenuItems[role] || []} className="user-management-theme"
      eyebrow="Hệ thống phân quyền & kiểm soát tài khoản"
      title="Quản lý người dùng"
      subtitle="Quản lý tài khoản tiếp tân, huấn luyện viên và hội viên trong trung tâm.">
      <section className="dashboard-panel service-panel user-management-panel">
        <div className="panel-heading service-heading">
          <div><h3>Tài khoản hệ thống</h3><p>Tiếp tân · Huấn luyện viên · Member</p></div>
          <div className="user-management-actions">
            <button className="subject-button" disabled title="Chưa có API xuất danh sách" type="button">
              <span className="material-symbols-outlined" aria-hidden="true">download</span>Xuất danh sách
            </button>
            <button className="subject-button subject-primary" disabled title="Chưa có API tạo tài khoản" type="button">
              <span className="material-symbols-outlined" aria-hidden="true">person_add</span>Thêm tài khoản mới
            </button>
          </div>
        </div>

        <div className="user-management-toolbar">
          <div className="user-management-search-filter">
            <label className="service-search"><span className="visually-hidden">Tìm kiếm tài khoản</span>
              <span className="input-wrap"><span className="material-symbols-outlined" aria-hidden="true">search</span>
                <input
                  type="search"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Tìm kiếm theo tên, UID, email, số điện thoại..."
                />
              </span>
            </label>
            <label className="service-filter"><span className="visually-hidden">Lọc trạng thái</span>
              <select value={selectedStatus} onChange={handleStatusChange}>
                <option value="">Tất cả trạng thái</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <button className="subject-button" type="button" aria-label="Tải lại danh sách" onClick={handleRefresh}>
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            </button>
          </div>

          <div className="user-role-tabs" aria-label="Lọc người dùng theo vai trò">
            {roleTabs.map((label) => (
              <button
                className={`user-role-tab${(label === 'Tất cả vai trò' && !selectedRole) || selectedRole === label ? ' user-role-tab-active' : ''}`}
                key={label}
                type="button"
                onClick={() => handleRoleChange(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {statusUpdateError && (
          <div className="user-management-action-error" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            {statusUpdateError}
          </div>
        )}

        {error && (
          <div className="subject-empty user-management-empty" style={{ marginTop: '16px' }}>
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <strong>Không thể tải dữ liệu</strong>
            <p>{error}</p>
          </div>
        )}

        {!error && (
          <div className="subject-table-scroll" tabIndex={0} role="region" aria-label="Bảng người dùng">
            <table className="subject-table service-table">
              <thead>
                <tr>{['UID', 'Thành viên', 'Email liên hệ', 'Số điện thoại', 'Vai trò (Role)', 'Trạng thái', 'Thao tác'].map((label) => <th key={label} scope="col">{label}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="subject-empty user-management-empty" colSpan={7}>
                      <span className="material-symbols-outlined" aria-hidden="true">sync</span>
                      <strong>Đang tải danh sách người dùng…</strong>
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.userId ?? user.id ?? `${user.email}-${user.fullName}`}>
                      <td>{user.userId ?? user.id ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>{user.fullName || '—'}</strong>
                          <small>{user.username || '—'}</small>
                        </div>
                      </td>
                      <td>{user.email || '—'}</td>
                      <td>{user.phone || '—'}</td>
                      <td>{user.role || '—'}</td>
                      <td>
                        {user.status === 'Locked' ? (
                          <span className="status-badge status-locked">Locked</span>
                        ) : (
                          <div className="user-status-control">
                            <button
                              aria-checked={user.status === 'Active'}
                              aria-label={`${user.status === 'Active' ? 'Tắt' : 'Bật'} hoạt động của ${user.username || user.fullName || user.userId}`}
                              className={`user-status-toggle${user.status === 'Active' ? ' user-status-toggle-on' : ''}`}
                              disabled={updatingUserIds.includes(user.userId)}
                              onClick={() => handleStatusToggle(user)}
                              role="switch"
                              type="button"
                            >
                              <span />
                            </button>
                            <span className={`status-badge ${user.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                              {updatingUserIds.includes(user.userId) ? 'Đang cập nhật…' : user.status || '—'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          className="subject-button"
                          type="button"
                          aria-label={`Xem thông tin ${user.username || user.fullName || user.userId}`}
                          onClick={() => loadUserDetail(user)}
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="subject-empty user-management-empty" colSpan={7}>
                      <span className="material-symbols-outlined" aria-hidden="true">manage_accounts</span>
                      <strong>Chưa có dữ liệu phù hợp</strong>
                      <p>Không tìm thấy người dùng nào theo bộ lọc hiện tại.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!error && (
          <div className="service-footer user-management-footer">
            <span>{loading ? 'Đang tải…' : total > 0 ? `Tổng ${total} người dùng` : 'Chưa có dữ liệu để hiển thị'}</span>
            <div className="service-pagination" aria-label="Phân trang">
              <button
                className="subject-button"
                disabled={loading || page === 0}
                type="button"
                aria-label="Trang trước"
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
              >
                ‹
              </button>
              <button className="subject-button user-page-active" disabled type="button" aria-current="page">
                {currentPage}
              </button>
              <button
                className="subject-button"
                disabled={loading || page + 1 >= totalPages}
                type="button"
                aria-label="Trang sau"
                onClick={() => setPage((current) => current + 1)}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </section>
      {detailUser && (
        <Modal title="Chi tiết người dùng" className="user-detail-modal" onClose={closeDetail}>
          <div className="user-detail-content">
            <div className="user-detail-profile">
              <span className="user-detail-avatar" aria-hidden="true">{detailInitials}</span>
              <div className="user-detail-identity">
                <strong>{detailUser.fullName || 'Chưa có tên'}</strong>
                <span>@{detailUser.username || '—'}</span>
              </div>
              <span className={`status-badge status-${(detailUser.status || '').toLowerCase()}`}>
                {detailUser.status || '—'}
              </span>
            </div>
            {detailLoading && (
              <div className="subject-loading" role="status">
                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                Đang tải thông tin người dùng…
              </div>
            )}
            {detailError && (
              <div className="auth-error subject-modal-error" role="alert">{detailError}</div>
            )}
            {!detailLoading && !detailError && (
              <div className="user-detail-sections">
                <section className="user-detail-section" aria-labelledby="user-detail-personal-title">
                  <h4 id="user-detail-personal-title">Thông tin cá nhân</h4>
                  <dl className="user-detail-grid">
                    {[
                      ['Email', detailUser.email],
                      ['Số điện thoại', detailUser.phone],
                      ['Ngày sinh', detailUser.dob],
                      ['Giới tính', detailUser.gender],
                      ['Địa chỉ', detailUser.address, 'user-detail-wide'],
                    ].map(([label, value, className]) => (
                      <div className={`user-detail-item ${className || ''}`} key={label}>
                        <dt>{label}</dt>
                        <dd>{value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section className="user-detail-section" aria-labelledby="user-detail-account-title">
                  <h4 id="user-detail-account-title">Thông tin tài khoản</h4>
                  <dl className="user-detail-grid">
                    {[
                      ['UID', detailUser.userId],
                      ['Tên đăng nhập', detailUser.username],
                      ['Vai trò', detailUser.role],
                      ['Trạng thái', detailUser.status],
                    ].map(([label, value]) => (
                      <div className="user-detail-item" key={label}>
                        <dt>{label}</dt>
                        <dd>{value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            )}
          </div>
          <div className="subject-modal-actions user-detail-actions">
            {detailError && (
              <button className="subject-button" type="button" onClick={() => loadUserDetail(detailUser)}>
                Thử lại
              </button>
            )}
            <button className="subject-button" type="button" onClick={closeDetail}>Đóng</button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  )
}
