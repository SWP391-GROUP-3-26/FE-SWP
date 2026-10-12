import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import memberMenuItems from '../components/memberMenuItems'
import { classApiErrorMessage, getMyClasses } from '../services/memberClassService'
import './MemberActivities.css'

const WEEKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
const DEFAULT_TIME_SLOTS = [
  '07:00 - 08:30',
  '09:30 - 11:00',
  '15:30 - 17:00',
  '18:00 - 19:30',
]

function getMonday(date) {
  const monday = new Date(date)
  const day = monday.getDay()
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date)
}

function addDays(date, amount) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function normalizeDay(day) {
  const value = String(day || '')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s._-]/g, '')

  if (['thu2', 'thuhai', 't2', 'monday', 'mon'].includes(value)) return 0
  if (['thu3', 'thuba', 't3', 'tuesday', 'tue'].includes(value)) return 1
  if (['thu4', 'thutu', 't4', 'wednesday', 'wed'].includes(value)) return 2
  if (['thu5', 'thunam', 't5', 'thursday', 'thu'].includes(value)) return 3
  if (['thu6', 'thusau', 't6', 'friday', 'fri'].includes(value)) return 4
  if (['thu7', 'thubay', 't7', 'saturday', 'sat'].includes(value)) return 5
  if (['chunhat', 'cn', 'sunday', 'sun'].includes(value)) return 6
  return -1
}

function daysForClass(classItem) {
  return String(classItem.schedule || '')
    .split(/[(),;]/)
    .flatMap((part) => part.split(','))
    .map(normalizeDay)
    .filter((day, index, days) => day >= 0 && days.indexOf(day) === index)
}

function timeKey(classItem) {
  const time = String(classItem.timeSlot || '').trim()
  return time || 'Giờ chưa cập nhật'
}

function timeSortValue(value) {
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.MAX_SAFE_INTEGER
}

export default function MemberSchedule() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const today = new Date()
  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
  const timeSlots = [...new Set([...DEFAULT_TIME_SLOTS, ...classes.map(timeKey)])]
    .sort((left, right) => timeSortValue(left) - timeSortValue(right))

  useEffect(() => {
    const controller = new AbortController()
    getMyClasses({ status: 'ongoing', signal: controller.signal })
      .then(setClasses)
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(classApiErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [reloadKey])

  function shiftWeek(amount) {
    setWeekStart((current) => addDays(current, amount * 7))
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
            <strong>Tuần này: {weekLabel}</strong>
            <button type="button" aria-label="Tuần sau" onClick={() => shiftWeek(1)}>
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
          </div>
          <button className="member-today-button" type="button" onClick={() => setWeekStart(getMonday(new Date()))}>
            Hôm nay
          </button>
          <span className={`member-sync-status${loadError ? ' member-sync-error' : ''}`}>
            <span aria-hidden="true" />
            {loading ? 'Đang đồng bộ' : loadError ? 'Chưa đồng bộ' : `${classes.length} lớp đang đăng ký`}
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
        {!loading && !loadError && classes.length === 0 && (
          <div className="member-schedule-notice" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
            <span>Bạn chưa có lớp đang đăng ký. Lớp đăng ký thành công sẽ tự động xuất hiện tại đây.</span>
          </div>
        )}

        <div className="member-calendar-scroll" aria-label={`Thời khóa biểu tuần ${weekLabel}`}>
            {loading && (
              <div className="member-schedule-loading" role="status">Đang tải thời khóa biểu...</div>
            )}
            {!loading && !loadError && (
              <table className="member-calendar">
                <thead>
                  <tr>
                    <th className="member-time-heading" scope="col">Khung giờ</th>
                    {WEEKDAYS.map((weekday, index) => {
                      const date = addDays(weekStart, index)
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
                  {timeSlots.map((slot) => (
                    <tr key={slot}>
                      <th className="member-time-cell" scope="row">
                        <strong>{slot === 'Giờ chưa cập nhật' ? slot : 'Lịch học'}</strong>
                        <span>{slot}</span>
                      </th>
                      {WEEKDAYS.map((weekday, dayIndex) => {
                        const dayClasses = classes.filter((classItem) => (
                          timeKey(classItem) === slot && daysForClass(classItem).includes(dayIndex)
                        ))
                        return (
                          <td className="member-calendar-class-cell" key={`${slot}-${weekday}`}>
                            {dayClasses.map((classItem) => (
                              <article className="member-schedule-class" key={classItem.bookingId}>
                                <strong>{classItem.className}</strong>
                                <span>{classItem.classCode}</span>
                                {classItem.roomName && <span>{classItem.roomName}</span>}
                                {classItem.coachName && <span>{classItem.coachName}</span>}
                              </article>
                            ))}
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
    </DashboardLayout>
  )
}
