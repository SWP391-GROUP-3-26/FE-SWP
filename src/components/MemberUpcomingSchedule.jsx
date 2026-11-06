import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { classApiErrorMessage, getMyClasses } from '../services/memberClassService'
import { calendarDateKey, getSessionTimes, isConfirmedBooking, parseCalendarDate } from '../utils/classSchedule'
import './MemberUpcomingSchedule.css'

function getUpcomingSessions(classes) {
  const now = new Date()
  const today = calendarDateKey(now)
  const seen = new Set()

  return classes
    .flatMap((item) => Array.isArray(item.sessions)
      ? item.sessions.map((session) => ({ ...item, ...session }))
      : [item])
    .filter((item) => {
      const date = parseCalendarDate(item.sessionDate)
      const dateKey = date && calendarDateKey(date)
      const sessionStatus = String(item.sessionStatus || '').trim().toLowerCase()
      if (!date || dateKey < today || ['cancelled', 'cancel', 'đã hủy', 'completed', 'đã hoàn thành'].includes(sessionStatus)) return false
      // rawStatus is the member's booking/payment state; sessionStatus "Scheduled"
      // alone must not make a pending payment look like a confirmed class.
      if (!isConfirmedBooking(item)) return false
      const { startTime } = getSessionTimes(item)
      if (dateKey === today && startTime && `${dateKey}T${startTime}` < `${today}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`) return false
      const key = `${item.bookingId || item.classId}-${item.sessionId || item.sessionDate}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((first, second) => {
      const firstKey = `${first.sessionDate} ${getSessionTimes(first).startTime}`
      const secondKey = `${second.sessionDate} ${getSessionTimes(second).startTime}`
      return firstKey.localeCompare(secondKey)
    })
    .slice(0, 3)
}

function formatWeekday(value) {
  const date = parseCalendarDate(value)
  return date ? new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(date) : ''
}

function formatDate(value) {
  const date = parseCalendarDate(value)
  return date ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date) : ''
}

export default function MemberUpcomingSchedule() {
  const [state, setState] = useState({ sessions: [], loading: true, error: '' })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getMyClasses({ status: 'all', signal: controller.signal })
      .then((classes) => {
        if (!controller.signal.aborted) setState({ sessions: getUpcomingSessions(classes), loading: false, error: '' })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ sessions: [], loading: false, error: classApiErrorMessage(error) })
      })
    return () => controller.abort()
  }, [reload])

  return (
    <section className="member-upcoming-schedule" aria-labelledby="member-upcoming-title">
      <header className="member-upcoming-heading">
        <div>
          <span className="section-heading-kicker">THỜI KHÓA BIỂU CỦA BẠN</span>
          <h2 id="member-upcoming-title">Lịch học sắp tới</h2>
        </div>
        <Link to="/member/schedule">Xem thời khóa biểu</Link>
      </header>

      {state.loading && <p className="member-upcoming-message" role="status">Đang tải lịch học của bạn…</p>}
      {state.error && <div className="member-upcoming-error" role="alert">
        <span>{state.error}</span>
        <button type="button" onClick={() => {
          setState((current) => ({ ...current, loading: true, error: '' }))
          setReload((current) => current + 1)
        }}>Thử lại</button>
      </div>}
      {!state.loading && !state.error && state.sessions.length === 0 && (
        <div className="member-upcoming-empty">
          <span className="material-symbols-outlined" aria-hidden="true">event_available</span>
          <div><strong>Chưa có buổi học sắp tới</strong><p>Các buổi đã xác nhận sẽ hiển thị tại đây.</p></div>
          <Link to="/member/schedule">Mở lịch tập</Link>
        </div>
      )}
      {!state.loading && !state.error && state.sessions.length > 0 && (
        <div className="member-upcoming-list">
          {state.sessions.map((item) => {
            const { startTime, endTime } = getSessionTimes(item)
            return <article className="member-upcoming-item" key={`${item.bookingId || item.classId}-${item.sessionId || item.sessionDate}`}>
              <div className="member-upcoming-date">
                <strong>{formatDate(item.sessionDate)}</strong>
                <span>{formatWeekday(item.sessionDate)}</span>
              </div>
              <div className="member-upcoming-class">
                <strong>{item.className || item.subjectName || 'Buổi học'}</strong>
                <span>{item.classCode || item.subjectName || item.schedule || 'Lớp đã đăng ký'}</span>
              </div>
              <div className="member-upcoming-detail">
                <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                {startTime && endTime ? `${startTime}–${endTime}` : 'Chưa cập nhật giờ'}
              </div>
              <div className="member-upcoming-detail">
                <span className="material-symbols-outlined" aria-hidden="true">location_on</span>
                {item.roomName || item.room || 'Chưa cập nhật phòng'}
              </div>
            </article>
          })}
        </div>
      )}
    </section>
  )
}
