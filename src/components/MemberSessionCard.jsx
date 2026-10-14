import { formatClassDate } from '../utils/classSchedule'

export default function MemberSessionCard({ entry }) {
  const { item, date, startTime, endTime, reasons } = entry
  return (
    <article className="member-schedule-class">
      <strong>{item.className}</strong>
      <span>{item.classCode}</span>
      <span>{date ? formatClassDate(date) : 'Ngày buổi học: Chưa thiết lập'}</span>
      <span>{startTime && endTime ? `${startTime} – ${endTime}` : item.timeSlot || 'Giờ học: Chưa thiết lập'}</span>
      {item.roomName && <span>{item.roomName}</span>}
      {item.coachName && <span>{item.coachName}</span>}
      {item.status && <span>{item.status}</span>}
      {reasons.map((reason) => <span key={reason}>{reason}</span>)}
    </article>
  )
}
