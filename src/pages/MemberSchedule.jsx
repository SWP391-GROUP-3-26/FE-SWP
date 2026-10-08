import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import memberMenuItems from '../components/memberMenuItems'
import './MemberActivities.css'

const WEEKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
const TIME_SLOTS = [
  { label: 'Slot 1', time: '07:00 - 08:30' },
  { label: 'Slot 2', time: '09:30 - 11:00' },
  { label: 'Slot 3', time: '15:30 - 17:00' },
  { label: 'Slot 4', time: '18:00 - 19:30' },
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

export default function MemberSchedule() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const today = new Date()
  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`

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
          <p>Thời khóa biểu chỉ hiển thị các lớp bạn đã đăng ký thành công và thanh toán hợp lệ.</p>
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
          <span className="member-sync-status">
            <span aria-hidden="true" />
            Chưa có dữ liệu ghi danh
          </span>
        </div>

        <div className="member-schedule-notice" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">info</span>
          <span>
            Backend hiện chưa có API ghi danh, thanh toán hoặc lịch cá nhân của hội viên. Danh sách lớp đang hoạt động
            không được dùng thay cho lịch cá nhân.
          </span>
        </div>

        <div className="member-calendar-scroll" aria-label={`Thời khóa biểu tuần ${weekLabel}`}>
          <div className="member-calendar">
            <div className="member-calendar-row member-calendar-head">
              <div className="member-time-heading">Khung giờ</div>
              {WEEKDAYS.map((weekday, index) => {
                const date = addDays(weekStart, index)
                const isToday = date.toDateString() === today.toDateString()
                return (
                  <div
                    className={`member-day-heading${isToday ? ' member-day-today' : ''}${index === 6 ? ' member-day-sunday' : ''}`}
                    key={weekday}
                  >
                    <span>{weekday}</span>
                    <strong>{date.getDate()}</strong>
                    {isToday && <small>Hôm nay</small>}
                  </div>
                )
              })}
            </div>
            {TIME_SLOTS.map((slot) => (
              <div className="member-calendar-row" key={slot.label}>
                <div className="member-time-cell">
                  <strong>{slot.label}</strong>
                  <span>{slot.time}</span>
                </div>
                {WEEKDAYS.map((weekday) => (
                  <div className="member-calendar-empty-cell" key={`${slot.label}-${weekday}`}>
                    <span className="material-symbols-outlined" aria-hidden="true">add_circle_outline</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </DashboardLayout>
  )
}
