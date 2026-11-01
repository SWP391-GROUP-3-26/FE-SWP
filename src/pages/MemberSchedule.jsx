import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import memberMenuItems from '../components/memberMenuItems'
import MemberSessionCard from '../components/MemberSessionCard'
import WeeklyTimetable from '../components/WeeklyTimetable'
import MemberSessionEvaluation from '../components/MemberSessionEvaluation'
import { getMySessionEvaluations, sessionEvaluationError } from '../services/sessionEvaluationService'
import { classApiErrorMessage, getMyClasses } from '../services/memberClassService'
import { addCalendarDays, getMonday, isConfirmedBooking, memberWeekSchedule } from '../utils/classSchedule'
import './MemberActivities.css'

function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export default function MemberSchedule() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [evaluationSessions, setEvaluationSessions] = useState([])
  const [evaluationError, setEvaluationError] = useState('')
  const [selectedEvaluation, setSelectedEvaluation] = useState(null)
  const weekEnd = addCalendarDays(weekStart, 6)
  const weekLabel = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
  const { sessions, otherSessions } = memberWeekSchedule(classes, weekStart)
  const weekSessionCount = sessions.length + otherSessions.filter((entry) => entry.date).length
  const hasBookings = classes.some((item) => isConfirmedBooking(item) || item.sessions?.some(isConfirmedBooking))

  useEffect(() => {
    const controller = new AbortController()
    Promise.allSettled([getMyClasses({ status: 'all', signal: controller.signal }), getMySessionEvaluations(controller.signal)])
      .then(([bookings, evaluations]) => {
        if (controller.signal.aborted) return
        if (bookings.status === 'rejected') throw bookings.reason
        setClasses(bookings.value); setLoadError('')
        if (evaluations.status === 'fulfilled') {
          setEvaluationSessions(evaluations.value.map((item) => item.sessionId)); setEvaluationError('')
        } else { setEvaluationSessions([]); setEvaluationError(sessionEvaluationError(evaluations.reason)) }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(classApiErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [reloadKey])

  function shiftWeek(amount) {
    setWeekStart((current) => addCalendarDays(current, amount * 7))
  }

  const evaluated = new Set(evaluationSessions)
  const renderSession = (entry) => <MemberSessionCard key={entry.key} entry={entry}
    onViewEvaluation={evaluated.has(entry.item.sessionId) ? () => setSelectedEvaluation(entry.item.sessionId) : undefined} />

  return (
    <DashboardLayout
      eyebrow="Hội viên / Lịch tập"
      menuItems={memberMenuItems}
      role="Hội viên"
      showIntro={false}
      title="Lịch luyện tập"
    >
      <section className="member-page-heading">
        <div>
          <span className="section-heading-kicker">KẾ HOẠCH CỦA BẠN</span>
          <h2>Lịch luyện tập</h2>
          <p>Thời khóa biểu được đồng bộ từ các lớp bạn đã đăng ký thành công.</p>
        </div>
        <span className="member-page-heading-icon material-symbols-outlined" aria-hidden="true">calendar_month</span>
      </section>

      <section className="member-schedule-panel" aria-label="Thời khóa biểu hàng tuần">
        <div className="member-schedule-toolbar">
          <div className="member-week-controls">
            <button type="button" aria-label="Tuần trước" onClick={() => shiftWeek(-1)}>
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            <strong>Tuần đang xem: {weekLabel}</strong>
            <button type="button" aria-label="Tuần sau" onClick={() => shiftWeek(1)}>
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
          </div>
          <button className="member-today-button" type="button" onClick={() => setWeekStart(getMonday(new Date()))}>
            Hôm nay
          </button>
          <span className={`member-sync-status${loadError ? ' member-sync-error' : ''}`}>
            <span aria-hidden="true" />
            {loading ? 'Đang đồng bộ' : loadError ? 'Chưa đồng bộ' : `${weekSessionCount} buổi trong tuần`}
          </span>
        </div>

        {loadError && (
          <div className="member-schedule-notice member-schedule-error" role="alert">
            <span>{loadError}</span>
            <button type="button" onClick={() => {
              setLoading(true)
              setLoadError('')
              setReloadKey((key) => key + 1)
            }}>Thử lại</button>
          </div>
        )}
        {evaluationError && <div className="member-schedule-notice member-schedule-error" role="alert">
          <span>Lịch tập vẫn hiển thị; chưa tải được đánh giá. {evaluationError}</span>
          <button type="button" onClick={() => { setLoading(true); setReloadKey((key) => key + 1) }}>Thử lại</button>
        </div>}
        {!loading && !loadError && !hasBookings && (
          <div className="member-schedule-notice" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
            <span>Bạn chưa có lớp đã đăng ký. Buổi học được xác nhận sẽ hiển thị tại đây.</span>
          </div>
        )}
        {!loading && !loadError && hasBookings && weekSessionCount === 0 && (
          <div className="member-schedule-notice member-schedule-empty-week" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
            <strong>Hiện tại bạn không có buổi học nào trong tuần này!</strong>
          </div>
        )}

        <div className="member-calendar-scroll" tabIndex={0} role="region" aria-label={`Thời khóa biểu tuần ${weekLabel}`}>
            {loading && (
              <div className="member-schedule-loading" role="status">Đang tải thời khóa biểu...</div>
            )}
            {!loading && !loadError && (
              <WeeklyTimetable weekStart={weekStart} sessions={sessions} renderSession={renderSession} />
            )}
        </div>
      </section>
      {!loading && !loadError && otherSessions.length > 0 && (
        <section className="member-data-section member-schedule-other" aria-labelledby="member-other-sessions-title">
          <h3 id="member-other-sessions-title">Buổi học cần kiểm tra lịch</h3>
          <p>Buổi có ngày dưới đây thuộc tuần đang xem. Buổi chưa có ngày được giữ lại để bạn kiểm tra với trung tâm; hệ thống chưa thể xếp vào lịch.</p>
          <div className="member-class-grid">
            {otherSessions.map(renderSession)}
          </div>
        </section>
      )}
      {selectedEvaluation != null && <MemberSessionEvaluation key={selectedEvaluation} sessionId={selectedEvaluation} onClose={() => setSelectedEvaluation(null)} />}
    </DashboardLayout>
  )
}
