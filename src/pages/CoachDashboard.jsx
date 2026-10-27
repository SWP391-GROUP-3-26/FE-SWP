import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import coachMenuItems from '../components/coachMenuItems'
import { coachClassApiErrorMessage, getCoachClasses } from '../services/coachClassService'
import './CoachDashboard.css'

function StatCard({ icon, label, value, tone }) {
  return (
    <article className={`coach-home-stat coach-home-stat-${tone}`}>
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
      <div><small>{label}</small><strong>{value ?? '—'}</strong></div>
      <span className="coach-home-stat-mark" aria-hidden="true" />
    </article>
  )
}

function classStatus(item) {
  const labels = { Active: 'Đang diễn ra', Open: 'Đang mở đăng ký', Completed: 'Đã hoàn thành', Cancelled: 'Đã hủy', Cancel: 'Đã hủy' }
  return item.statusDisplay || labels[item.status] || item.status || 'Chưa cập nhật'
}

function dateLabel() {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())
}

export default function CoachDashboard() {
  const [classes, setClasses] = useState([])
  const [counts, setCounts] = useState(null)
  const [coachName, setCoachName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getCoachClasses({ status: 'all', signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        setClasses(result.classes)
        setCounts(result.counts)
        setCoachName(result.coachName || '')
        setLoadError('')
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(coachClassApiErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [reloadKey])

  const activeClasses = classes
    .filter((item) => ['active', 'open'].includes(String(item.status || '').toLowerCase()))
    .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))

  function retryLoad() {
    setLoading(true)
    setLoadError('')
    setReloadKey((value) => value + 1)
  }

  return (
    <DashboardLayout
      eyebrow="UniSports / Huấn luyện viên"
      menuItems={coachMenuItems}
      role="Coach"
      roleLabel="Huấn luyện viên"
      showIntro={false}
      title="Tổng quan"
    >
      <div className="coach-dashboard">
        <section className="coach-home-welcome">
          <div className="coach-home-welcome-copy">
            <span className="section-heading-kicker">TỔNG QUAN HÔM NAY</span>
            <h2>{coachName ? `Xin chào, ${coachName}` : 'Chào mừng trở lại'}</h2>
            <p>{dateLabel()} <span aria-hidden="true">·</span> Đây là lịch dạy và tình hình các lớp bạn phụ trách.</p>
          </div>
          <Link className="coach-home-action" to="/coach/classes">
            Xem danh sách lớp <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </Link>
          <span className="coach-home-decoration material-symbols-outlined" aria-hidden="true">sports_gymnastics</span>
        </section>

        <section className="coach-home-stats" aria-label="Thống kê nhanh">
          <StatCard icon="groups" label="Lớp đang phụ trách" value={counts?.activeClasses} tone="green" />
          <StatCard icon="person" label="Học viên đang theo học" value={counts?.totalStudents} tone="orange" />
          <StatCard icon="event_note" label="Tổng số lớp" value={counts?.totalClasses} tone="blue" />
          <StatCard icon="task_alt" label="Lớp đã hoàn thành" value={counts?.completedClasses} tone="violet" />
        </section>

        <section className="coach-home-schedule dashboard-panel" aria-label="Lịch học định kỳ">
          <header className="coach-home-section-heading">
            <div>
              <span className="section-heading-kicker">THEO LỊCH CỦA LỚP</span>
              <h3>Lịch học định kỳ</h3>
            </div>
            <span className="coach-home-class-count">
              {loading ? 'Đang tải' : `${activeClasses.length} lớp hoạt động`}
            </span>
          </header>

          {loadError && (
            <div className="coach-home-feedback is-error" role="alert">
              <span>{loadError}</span><button onClick={retryLoad} type="button">Thử lại</button>
            </div>
          )}
          {loading && <div className="coach-home-feedback" role="status"><span className="coach-home-spinner" />Đang tải lịch lớp...</div>}
          {!loading && !loadError && activeClasses.length === 0 && (
            <div className="coach-home-empty">
              <span className="material-symbols-outlined" aria-hidden="true">event_available</span>
              <div>
                <strong>{classes.length ? 'Hiện chưa có lớp hoạt động' : 'Bạn chưa được phân công lớp học'}</strong>
                <p>{classes.length ? 'Các lớp đang hoạt động sẽ xuất hiện tại đây.' : 'Khi trung tâm phân công lớp, lịch học và thông tin lớp sẽ được cập nhật tại đây.'}</p>
              </div>
              <Link to="/coach/classes">Mở danh sách lớp</Link>
            </div>
          )}
          {!loading && !loadError && activeClasses.length > 0 && (
            <div className="coach-home-class-list">
              {activeClasses.map((item) => (
                <article className="coach-home-class-row" key={item.classId}>
                  <div className="coach-home-class-icon material-symbols-outlined" aria-hidden="true">fitness_center</div>
                  <div className="coach-home-class-main">
                    <div className="coach-home-class-title">
                      <h4>{item.name || 'Lớp học'}</h4>
                      <span className={`coach-home-status status-${String(item.status || '').toLowerCase()}`}>{classStatus(item)}</span>
                    </div>
                    <p>{item.subjectName || 'Chưa cập nhật môn học'} <span aria-hidden="true">·</span> {item.classCode || `Lớp #${item.classId}`}</p>
                  </div>
                  <div className="coach-home-class-meta">
                    <span><span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>{item.schedule || 'Chưa cập nhật lịch'}</span>
                    <span><span className="material-symbols-outlined" aria-hidden="true">location_on</span>{item.roomName || 'Chưa xếp phòng'}</span>
                  </div>
                  <div className="coach-home-student-count">
                    <strong>{item.enrolledStudentsCount ?? 0}</strong><small>học viên</small>
                  </div>
                  <Link className="coach-home-detail-link" to={`/coach/classes/${item.classId}`} aria-label={`Xem lớp ${item.name || item.classId}`}>
                    <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
