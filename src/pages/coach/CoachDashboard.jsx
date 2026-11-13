import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import coachMenuItems from '../../layouts/coachMenuItems'
import CoachWeeklySchedule from '../../components/coach/CoachWeeklySchedule'
import { coachClassApiErrorMessage, getCoachTeachingSchedule } from '../../services/coachClassService'
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

export default function CoachDashboard() {
  const [classes, setClasses] = useState([])
  const [counts, setCounts] = useState(null)
  const [coachName, setCoachName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getCoachTeachingSchedule(controller.signal)
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
      title="Lịch dạy"
    >
      <div className="coach-dashboard">
        <section className="coach-home-welcome">
          <div className="coach-home-welcome-copy">
            <span className="section-heading-kicker">TỔNG QUAN HÔM NAY</span>
            <h2>{coachName ? `Xin chào, ${coachName}` : 'Chào mừng trở lại'}</h2>
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

        <CoachWeeklySchedule classes={classes} loading={loading} error={loadError} onRetry={retryLoad} />
      </div>
    </DashboardLayout>
  )
}
