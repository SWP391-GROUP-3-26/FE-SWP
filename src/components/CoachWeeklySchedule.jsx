import { useState } from 'react'
import { Link } from 'react-router-dom'
import MemberSessionCard from './MemberSessionCard'
import WeeklyTimetable from './WeeklyTimetable'
import { addCalendarDays, getMonday } from '../utils/classSchedule'
import { coachWeekSchedule } from '../utils/coachSchedule'
import '../pages/MemberActivities.css'

function SessionCard({ entry }) {
  return <div className="coach-calendar-session">
    <MemberSessionCard entry={entry} />
    <Link className="coach-calendar-class-link" to={`/coach/classes/${entry.item.classId}`}>
      {entry.item.registeredMembers ?? 0} học viên · Xem lớp
      <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
    </Link>
  </div>
}

export default function CoachWeeklySchedule({ classes, loading, error, onRetry }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const format = (date) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  const weekLabel = `${format(weekStart)} - ${format(addCalendarDays(weekStart, 6))}`
  const { sessions, otherSessions } = coachWeekSchedule(classes, weekStart)
  const count = sessions.length + otherSessions.filter((entry) => entry.date).length
  const renderSession = (entry) => <SessionCard key={entry.key} entry={entry} />
  return <section aria-labelledby="coach-weekly-schedule-title">
    <header className="coach-home-section-heading">
      <div><span className="section-heading-kicker">THỜI KHÓA BIỂU CỦA BẠN</span><h3 id="coach-weekly-schedule-title">Lịch dạy trong tuần</h3></div>
    </header>
    <div className="member-schedule-panel">
      <div className="member-schedule-toolbar">
        <div className="member-week-controls">
          <button type="button" aria-label="Tuần trước" onClick={() => setWeekStart((date) => addCalendarDays(date, -7))}><span className="material-symbols-outlined" aria-hidden="true">chevron_left</span></button>
          <strong>Tuần đang xem: {weekLabel}</strong>
          <button type="button" aria-label="Tuần sau" onClick={() => setWeekStart((date) => addCalendarDays(date, 7))}><span className="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>
        </div>
        <button className="member-today-button" type="button" onClick={() => setWeekStart(getMonday(new Date()))}>Hôm nay</button>
        <span className={`member-sync-status${error ? ' member-sync-error' : ''}`}><span aria-hidden="true" />{loading ? 'Đang đồng bộ' : error ? 'Chưa đồng bộ' : `${count} buổi trong tuần`}</span>
      </div>
      {error && <div className="member-schedule-notice member-schedule-error" role="alert"><span>{error}</span><button type="button" onClick={onRetry}>Thử lại</button></div>}
      {!loading && !error && count === 0 && <div className="member-schedule-notice member-schedule-empty-week" role="status">
        <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
        <strong>{classes.length ? 'Bạn không có buổi dạy nào trong tuần này.' : 'Bạn chưa được phân công lớp học.'}</strong>
      </div>}
      <div className="member-calendar-scroll" tabIndex={0} role="region" aria-label={`Thời khóa biểu tuần ${weekLabel}`}>
        {loading && <div className="member-schedule-loading" role="status">Đang tải lịch dạy...</div>}
        {!loading && !error && <WeeklyTimetable weekStart={weekStart} sessions={sessions} renderSession={renderSession} />}
      </div>
    </div>
    {!loading && !error && otherSessions.length > 0 && <section className="member-data-section member-schedule-other" aria-label="Buổi dạy cần kiểm tra lịch">
      <h3>Buổi dạy cần kiểm tra lịch</h3>
      <p>Các buổi ngoài slot hoặc thiếu ngày được hiển thị riêng để bạn kiểm tra với trung tâm.</p>
      <div className="member-class-grid">{otherSessions.map(renderSession)}</div>
    </section>}
  </section>
}
