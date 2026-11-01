import { addCalendarDays, MEMBER_TIME_SLOTS } from '../utils/classSchedule'

const WEEKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']

export default function WeeklyTimetable({ weekStart, sessions, renderSession }) {
  const today = new Date()
  return <table className="member-calendar">
    <thead><tr>
      <th className="member-time-heading" scope="col">Slot</th>
      {WEEKDAYS.map((weekday, index) => {
        const date = addCalendarDays(weekStart, index)
        const isToday = date.toDateString() === today.toDateString()
        return <th className={`member-day-heading-cell${isToday ? ' is-today' : ''}${index === 6 ? ' is-sunday' : ''}`}
          key={weekday} scope="col" aria-current={isToday ? 'date' : undefined}>
          <div className={`member-day-heading${isToday ? ' member-day-today' : ''}${index === 6 ? ' member-day-sunday' : ''}`}>
            <span>{weekday} ({String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')})</span>
          </div>
        </th>
      })}
    </tr></thead>
    <tbody>{MEMBER_TIME_SLOTS.map((slot) => <tr key={slot.id}>
      <th className="member-time-cell" scope="row"><strong>{slot.id}</strong></th>
      {WEEKDAYS.map((weekday, dayIndex) => {
        const entries = sessions.filter((entry) => entry.slotId === slot.id && entry.dayIndex === dayIndex)
        return <td className="member-calendar-class-cell" key={`${slot.id}-${weekday}`}>
          {entries.map(renderSession)}
          {!entries.length && <span className="member-calendar-empty-label" aria-hidden="true">—</span>}
        </td>
      })}
    </tr>)}</tbody>
  </table>
}
