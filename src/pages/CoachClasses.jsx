import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import coachMenuItems from '../components/coachMenuItems'
import {
  getCoachClasses,
  coachClassApiErrorMessage,
} from '../services/coachClassService'
import './CoachClasses.css'

const filters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
]

function formatDate(value) {
  if (!value) return 'Chưa cập nhật'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function classPeriod(item) {
  return `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`
}

function statusLabel(item) {
  if (item.statusDisplay) return item.statusDisplay
  const labels = { Active: 'Đang diễn ra', Open: 'Đang mở đăng ký', Completed: 'Đã hoàn thành', Cancelled: 'Đã hủy', Cancel: 'Đã hủy' }
  return labels[item.status] || item.status || 'Chưa cập nhật'
}

function StatCard({ icon, label, value }) {
  return (
    <article className="coach-class-stat">
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
      <div><small>{label}</small><strong>{value ?? '—'}</strong></div>
    </article>
  )
}

export default function CoachClasses() {
  const [classes, setClasses] = useState([])
  const [counts, setCounts] = useState(null)
  const [coachName, setCoachName] = useState('')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    getCoachClasses({ search: submittedSearch, status, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        setClasses(result.classes)
        setCounts(result.counts)
        setCoachName(result.coachName || '')
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(coachClassApiErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [reloadKey, status, submittedSearch])

  function submitSearch(event) {
    event.preventDefault()
    setSubmittedSearch(search.trim())
    if (search.trim() === submittedSearch) setReloadKey((key) => key + 1)
  }

  return (
    <DashboardLayout
      eyebrow="Huấn luyện viên / Danh sách lớp"
      menuItems={coachMenuItems}
      role="Coach"
      roleLabel="Huấn luyện viên"
      showIntro={false}
      title="Danh sách lớp"
    >
      <section className="coach-classes-intro">
        <div>
          <span className="section-heading-kicker">LỚP ĐANG PHỤ TRÁCH</span>
          <h2>{coachName ? `Xin chào, ${coachName}` : 'Các lớp bạn phụ trách'}</h2>
          <p>Theo dõi lịch học, số lượng học viên và tình trạng từng lớp.</p>
        </div>
        <span className="material-symbols-outlined" aria-hidden="true">groups</span>
      </section>

      <section className="coach-class-stats" aria-label="Thống kê lớp học">
        <StatCard icon="class" label="Tổng số lớp" value={counts?.totalClasses} />
        <StatCard icon="event_available" label="Đang hoạt động" value={counts?.activeClasses} />
        <StatCard icon="task_alt" label="Đã hoàn thành" value={counts?.completedClasses} />
        <StatCard icon="groups" label="Tổng học viên" value={counts?.totalStudents} />
      </section>

      <section className="dashboard-panel coach-classes-panel" aria-label="Danh sách lớp phụ trách">
        <div className="coach-class-toolbar">
          <div className="coach-class-filters" role="group" aria-label="Lọc lớp theo trạng thái">
            {filters.map((filter) => (
              <button key={filter.value} type="button" aria-pressed={status === filter.value}
                onClick={() => setStatus(filter.value)}>{filter.label}</button>
            ))}
          </div>
          <form className="coach-class-search" onSubmit={submitSearch}>
            <label>
              <span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input aria-label="Tìm lớp học" placeholder="Tìm theo tên, mã lớp hoặc môn học" value={search}
                onChange={(event) => setSearch(event.target.value)} />
            </label>
            <button type="submit" disabled={loading}>Tìm kiếm</button>
            <button className="coach-class-refresh" type="button" aria-label="Tải lại danh sách" disabled={loading}
              onClick={() => setReloadKey((key) => key + 1)}>
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            </button>
          </form>
        </div>

        {loadError && <div className="coach-class-message is-error" role="alert">
          <span>{loadError}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Thử lại</button>
        </div>}
        {loading && <div className="coach-class-message" role="status">Đang tải danh sách lớp...</div>}
        {!loading && !loadError && classes.length === 0 && (
          <div className="coach-class-empty">
            <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
            <strong>{submittedSearch ? 'Không tìm thấy lớp phù hợp' : 'Bạn chưa được phân công lớp học'}</strong>
            <p>{submittedSearch ? 'Hãy thử từ khóa khác hoặc bỏ bộ lọc trạng thái.' : 'Các lớp được phân công cho bạn sẽ hiển thị tại đây.'}</p>
          </div>
        )}
        {!loading && !loadError && classes.length > 0 && (
          <div className="coach-class-table-scroll" tabIndex={0} role="region" aria-label="Bảng danh sách lớp, có thể cuộn ngang">
            <table className="coach-class-table">
              <thead><tr>
                <th scope="col">Lớp học</th><th scope="col">Môn học</th><th scope="col">Lịch học</th>
                <th scope="col">Thời hạn</th><th scope="col">Học viên</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th>
              </tr></thead>
              <tbody>{classes.map((item) => (
                <tr key={item.classId}>
                  <td><div className="coach-class-name"><strong>{item.name || 'Lớp học'}</strong><span>{item.classCode || `Lớp #${item.classId}`}</span></div></td>
                  <td><div className="coach-class-subject"><strong>{item.subjectName || 'Chưa phân môn'}</strong>{item.subjectCategory && <span>{item.subjectCategory}</span>}</div></td>
                  <td><div className="coach-class-schedule"><strong>{item.schedule || 'Chưa cập nhật'}</strong><span>{item.roomName || 'Chưa xếp phòng'}</span></div></td>
                  <td>{classPeriod(item)}</td>
                  <td><span className="coach-class-student-count">{item.enrolledStudentsCount ?? 0}<small> / {item.maxCapacity ?? '—'}</small></span></td>
                  <td><span className={`coach-class-status status-${String(item.status || '').toLowerCase()}`}>{statusLabel(item)}</span></td>
                  <td><Link className="coach-class-detail-button" to={`/coach/classes/${item.classId}`}>
                    <span className="material-symbols-outlined" aria-hidden="true">visibility</span>Chi tiết
                  </Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {!loading && !loadError && <div className="coach-class-results-count">Hiển thị {classes.length} lớp</div>}
      </section>

    </DashboardLayout>
  )
}
