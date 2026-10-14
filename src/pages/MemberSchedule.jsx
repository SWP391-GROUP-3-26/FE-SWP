import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import memberMenuItems from '../components/memberMenuItems'
import MemberSessionCard from '../components/MemberSessionCard'
import { classApiErrorMessage, getMyClasses } from '../services/memberClassService'
import { addCalendarDays, getMonday, isConfirmedBooking, MEMBER_TIME_SLOTS, memberWeekSchedule } from '../utils/classSchedule'
import './MemberActivities.css'

const WEEKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']

function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export default function MemberSchedule() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const today = new Date()
  const weekEnd = addCalendarDays(weekStart, 6)
  const weekLabel = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
  const { sessions, otherSessions } = memberWeekSchedule(classes, weekStart)
  const weekSessionCount = sessions.length + otherSessions.filter((entry) => entry.date).length
  const hasBookings = classes.some((item) => isConfirmedBooking(item) || item.sessions?.some(isConfirmedBooking))

  useEffect(() => {
    const controller = new AbortController()
    getMyClasses({ status: 'all', signal: controller.signal })
      .then((items) => { if (!controller.signal.aborted) setClasses(items) })
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
        {!loading && !loadError && !hasBookings && (
          <div className="member-schedule-notice" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
            <span>Bạn chưa có lớp đã đăng ký. Buổi học được xác nhận sẽ hiển thị tại đây.</span>
          </div>
        )}
        {!loading && !loadError && hasBookings && weekSessionCount === 0 && (
          <div className="member-schedule-notice" role="status">Không có buổi học nào đã xác định ngày trong tuần đang xem.</div>
        )}

        <div className="member-calendar-scroll" tabIndex={0} role="region" aria-label={`Thời khóa biểu tuần ${weekLabel}`}>
            {loading && (
              <div className="member-schedule-loading" role="status">Đang tải thời khóa biểu...</div>
            )}
            {!loading && !loadError && (
              <table className="member-calendar">
                <thead>
                  <tr>
                    <th className="member-time-heading" scope="col">Khung giờ</th>
                    {WEEKDAYS.map((weekday, index) => {
                      const date = addCalendarDays(weekStart, index)
                      const isToday = date.toDateString() === today.toDateString()
                      return (
                        <th className="member-day-heading-cell" key={weekday} scope="col">
                          <div className={`member-day-heading${isToday ? ' member-day-today' : ''}${index === 6 ? ' member-day-sunday' : ''}`}>
                            <span>{weekday}</span>
                            <strong>{date.getDate()}</strong>
                            {isToday && <small>Hôm nay</small>}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {MEMBER_TIME_SLOTS.map((slot) => (
                    <tr key={slot.id}>
                      <th className="member-time-cell" scope="row">
                        <strong>Slot {slot.id}</strong>
                        <span>{slot.startTime}–{slot.endTime}</span>
                      </th>
                      {WEEKDAYS.map((weekday, dayIndex) => {
                        const dayClasses = sessions.filter((entry) => (
                          entry.slotId === slot.id && entry.dayIndex === dayIndex
                        ))
                        return (
                          <td className="member-calendar-class-cell" key={`${slot.id}-${weekday}`}>
                            {dayClasses.map((entry) => <MemberSessionCard key={entry.key} entry={entry} />)}
                            {dayClasses.length === 0 && (
                              <span className="member-calendar-empty-label" aria-hidden="true">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </section>
      {!loading && !loadError && otherSessions.length > 0 && (
        <section className="member-data-section member-schedule-other" aria-labelledby="member-other-sessions-title">
          <h3 id="member-other-sessions-title">Buổi học cần kiểm tra lịch</h3>
          <p>Buổi có ngày dưới đây thuộc tuần đang xem. Buổi chưa có ngày được giữ lại để bạn kiểm tra với trung tâm; hệ thống chưa thể xếp vào lịch.</p>
          <div className="member-class-grid">
            {otherSessions.map((entry) => <MemberSessionCard key={entry.key} entry={entry} />)}
          </div>
        </section>
      )}
    </DashboardLayout>
  )
}
