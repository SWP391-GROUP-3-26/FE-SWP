import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import Modal from '../components/Modal'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'
import { getAuditLogDetail, getAuditLogs } from '../services/auditLogService'
import './AuditLog.css'

const ACTION_LABELS = { Add: 'Thêm mới', ADD: 'Thêm mới', Update: 'Cập nhật', UPDATE: 'Cập nhật', Delete: 'Xóa dữ liệu', DELETE: 'Xóa dữ liệu' }
const CATEGORY_LABELS = { Class: 'Lớp học', Package: 'Gói tập', User: 'Người dùng', Subject: 'Môn học', Payment: 'Thanh toán' }

function actionStyle(log) {
  const group = String(log.action || '').toLowerCase()
  const color = log.actionColor || ''
  if (group === 'add' || color === 'success') return 'is-add'
  if (group === 'delete' || color === 'danger') return 'is-delete'
  return 'is-update'
}

function displayAction(action) {
  return ACTION_LABELS[action] || action || 'Khác'
}

function displayCategory(category) {
  return CATEGORY_LABELS[category] || category || 'Khác'
}

function initials(performer) {
  return performer?.avatarInitials || performer?.fullName?.trim()?.charAt(0)?.toUpperCase() || 'HT'
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [filterOptions, setFilterOptions] = useState({ categories: [], actions: [] })
  const [category, setCategory] = useState('')
  const [action, setAction] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    getAuditLogs({ category, action, search, startDate, endDate, page, size: 10 }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setLogs(result.data)
        setFilterOptions(result.filterOptions || { categories: [], actions: [] })
        setTotalElements(Number(result.totalElements || 0))
        setTotalPages(Number(result.totalPages || 0))
        setPageSize(Number(result.pageSize || 10))
        const lastPage = Math.max(Number(result.totalPages || 0) - 1, 0)
        if (page > lastPage) setPage(lastPage)
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setLogs([])
          setError(requestError.message || 'Không thể tải nhật ký kiểm toán.')
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [category, action, search, startDate, endDate, page, reloadKey])

  const visibleCategories = useMemo(() => (filterOptions.categories || [])
    .filter((item) => item && !['all', 'tất cả'].includes(item.toLowerCase())), [filterOptions])
  const visibleActions = useMemo(() => (filterOptions.actions || [])
    .filter((item) => item.key && item.key !== 'ALL'), [filterOptions])
  const firstItem = totalElements === 0 ? 0 : page * pageSize + 1
  const lastItem = Math.min((page + 1) * pageSize, totalElements)

  async function openLog(log) {
    setSelectedLog(log)
    setDetailError('')
    setDetailLoading(true)
    const controller = new AbortController()
    try {
      const detail = await getAuditLogDetail(log.id, controller.signal)
      setSelectedLog(detail)
    } catch (requestError) {
      setDetailError(requestError.message || 'Không thể tải chi tiết nhật ký.')
    } finally {
      setDetailLoading(false)
    }
  }

  function submitSearch(event) {
    event.preventDefault()
    setPage(0)
    setSearch(searchInput.trim())
  }

  function updateCategory(value) {
    setCategory(value)
    setPage(0)
  }

  function updateAction(value) {
    setAction(value)
    setPage(0)
  }

  return (
    <DashboardLayout
      eyebrow="Quản trị trung tâm / Nhật ký hoạt động"
      menuItems={staffMenuItems[ROLES.CENTER_MANAGER]}
      role="Center Manager"
      roleLabel="Quản lý trung tâm"
      showIntro={false}
      title="Nhật ký hoạt động"
      className="audit-log-page-shell"
    >
      <section className="audit-log-page">
        <header className="audit-log-heading">
          <div>
            <span className="section-heading-kicker">LỊCH SỬ HOẠT ĐỘNG</span>
            <h2>Nhật ký hoạt động</h2>
            <p>Theo dõi các thay đổi được ghi nhận trong hệ thống.</p>
          </div>
          <span className="audit-log-heading-icon material-symbols-outlined" aria-hidden="true">history</span>
        </header>

        <section className="audit-log-panel" aria-label="Bộ lọc và nhật ký kiểm toán">
          <div className="audit-log-filters">
            <div className="audit-log-filter-row">
              <div className="audit-log-filter-group">
                <span className="audit-log-filter-label">Phân loại</span>
                <div className="audit-log-filter-chips" role="group" aria-label="Lọc theo phân loại">
                  <button type="button" aria-pressed={!category} onClick={() => updateCategory('')}>Tất cả</button>
                  {visibleCategories.map((item) => (
                    <button key={item} type="button" aria-pressed={category === item} onClick={() => updateCategory(item)}>
                      {displayCategory(item)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="audit-log-filter-group audit-log-actions-filter">
                <span className="audit-log-filter-label">Hành động</span>
                <div className="audit-log-filter-chips" role="group" aria-label="Lọc theo hành động">
                  <button type="button" aria-pressed={!action} onClick={() => updateAction('')}>Tất cả</button>
                  {visibleActions.map((item) => (
                    <button key={item.key} type="button" aria-pressed={action === item.key} onClick={() => updateAction(item.key)}>
                      {displayAction(item.key)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="audit-log-search-row">
              <form className="audit-log-search" onSubmit={submitSearch}>
                <span className="material-symbols-outlined" aria-hidden="true">search</span>
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)}
                  aria-label="Tìm nhật ký" placeholder="Tìm theo ID nhật ký, UID, họ tên hoặc nội dung thay đổi..." />
                <button type="submit">Tìm kiếm</button>
              </form>
              <div className="audit-log-date-range" aria-label="Lọc theo khoảng ngày">
                <label><span>Từ ngày</span><input type="date" value={startDate} max={endDate || undefined}
                  onChange={(event) => { setStartDate(event.target.value); setPage(0) }} /></label>
                <span className="audit-log-date-separator">đến</span>
                <label><span>Đến ngày</span><input type="date" value={endDate} min={startDate || undefined}
                  onChange={(event) => { setEndDate(event.target.value); setPage(0) }} /></label>
              </div>
            </div>
          </div>

          {error && <div className="audit-log-error" role="alert"><span>{error}</span>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Thử lại</button>
          </div>}
          <div className="audit-log-table-wrap" aria-busy={loading}>
            <table className="audit-log-table">
              <thead><tr>
                <th scope="col">Mã nhật ký</th><th scope="col">Người thực hiện</th><th scope="col">Phân loại</th>
                <th scope="col">Hành động</th><th scope="col">Thời gian</th>
              </tr></thead>
              <tbody>
                {!loading && !error && logs.length === 0 && <tr><td className="audit-log-empty" colSpan="5">
                  <span className="material-symbols-outlined" aria-hidden="true">manage_search</span>
                  Không tìm thấy nhật ký phù hợp.
                </td></tr>}
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td><button className="audit-log-code" type="button" onClick={() => void openLog(log)}>{log.logCode || `#LOG-${log.id}`}</button></td>
                    <td><button className="audit-log-performer" type="button" onClick={() => void openLog(log)}>
                      <span className="audit-log-avatar">{initials(log.performer)}</span>
                      <span><strong>{log.performer?.userCode || 'SYS-000'}</strong>
                        <small>{log.performer?.fullName || 'Hệ thống'}</small></span>
                    </button></td>
                    <td><span className={`audit-log-category category-${String(log.category || '').toLowerCase()}`}>{displayCategory(log.category)}</span></td>
                    <td><span className={`audit-log-action ${actionStyle(log)}`}><i />{displayAction(log.action)}</span></td>
                    <td className="audit-log-time">{log.formattedTime || (log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—')}</td>
                  </tr>
                ))}
                {loading && Array.from({ length: 4 }, (_, index) => <tr className="audit-log-loading-row" key={`loading-${index}`}>
                  <td colSpan="5"><span /></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <footer className="audit-log-footer">
            <span>Hiển thị <strong>{firstItem}–{lastItem}</strong> trong tổng số <strong>{totalElements}</strong> nhật ký</span>
            <div className="audit-log-pagination" aria-label="Phân trang nhật ký">
              <button type="button" aria-label="Trang đầu" disabled={page <= 0 || loading} onClick={() => setPage(0)}>|‹</button>
              <button type="button" aria-label="Trang trước" disabled={page <= 0 || loading} onClick={() => setPage((value) => value - 1)}>‹</button>
              <span>Trang <strong>{totalPages === 0 ? 0 : page + 1}</strong> / {totalPages}</span>
              <button type="button" aria-label="Trang sau" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>›</button>
              <button type="button" aria-label="Trang cuối" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(Math.max(totalPages - 1, 0))}>›|</button>
            </div>
          </footer>
        </section>
      </section>

      {selectedLog && <Modal className="audit-log-detail-modal" title="Chi tiết nhật ký kiểm toán" onClose={() => setSelectedLog(null)}>
        {detailLoading ? <p className="audit-log-detail-message" role="status">Đang tải chi tiết...</p> : (
          <>
            {detailError && <p className="audit-log-detail-error" role="alert">{detailError}</p>}
            <dl className="audit-log-detail-grid">
              <div><dt>Mã nhật ký</dt><dd>{selectedLog.logCode || `#LOG-${selectedLog.id}`}</dd></div>
              <div><dt>Người thực hiện</dt><dd>{selectedLog.performer?.displayText || selectedLog.performer?.fullName || 'Hệ thống'}</dd></div>
              <div><dt>Phân loại</dt><dd>{displayCategory(selectedLog.category)}</dd></div>
              <div><dt>Hành động</dt><dd>{displayAction(selectedLog.action)}</dd></div>
              <div><dt>Thời gian</dt><dd>{selectedLog.formattedTime || '—'}</dd></div>
              <div className="audit-log-description"><dt>Nội dung thay đổi</dt><dd>{selectedLog.description || 'Không có mô tả.'}</dd></div>
            </dl>
          </>
        )}
      </Modal>}
    </DashboardLayout>
  )
}
