export default function MemberSessionCard({ entry, onViewEvaluation }) {
  const { item, date, startTime, endTime, reasons } = entry
  const status = item.sessionStatus || item.status || item.rawStatus
  const statusLabels = {
    Scheduled: 'Đã lên lịch',
    Booked: 'Đã xác nhận',
    Confirmed: 'Đã xác nhận',
    Completed: 'Đã hoàn thành',
    Cancelled: 'Đã hủy',
    Pending: 'Chờ xác nhận',
  }
  const displayStatus = statusLabels[status] || status
  const attendance = {
    Present: { label: 'Có mặt', icon: 'check_circle', className: 'is-present' },
    Absent: { label: 'Vắng mặt', icon: 'cancel', className: 'is-absent' },
  }[item.attendanceStatus]
  return (
    <article className="member-schedule-class">
      <div className="member-schedule-class-heading">
        <strong>{item.className || 'Lớp học'}</strong>
        {displayStatus && <span className={`member-schedule-status${status === 'Completed' ? ' is-completed' : ''}`}>{displayStatus}</span>}
      </div>
      <div className="member-schedule-class-details">
        {item.classCode && <span className="member-schedule-class-code"><span className="material-symbols-outlined" aria-hidden="true">menu_book</span>{item.classCode}</span>}
        {attendance && <span className={`member-schedule-attendance ${attendance.className}`}>
          <span className="material-symbols-outlined" aria-hidden="true">{attendance.icon}</span>{attendance.label}
        </span>}
      </div>
      <span className="member-schedule-meta member-schedule-time">
        <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
        <strong>{startTime && endTime ? `${startTime}–${endTime}` : item.timeSlot || 'Chưa cập nhật giờ'}</strong>
      </span>
      {item.roomName && <span className="member-schedule-meta"><span className="material-symbols-outlined" aria-hidden="true">location_on</span>{item.roomName}</span>}
      {item.coachName && <span className="member-schedule-meta"><span className="material-symbols-outlined" aria-hidden="true">person</span>{item.coachName}</span>}
      {!date && <span className="member-schedule-meta">Ngày buổi học: Chưa thiết lập</span>}
      {reasons.map((reason) => <span className="member-schedule-meta" key={reason}>{reason}</span>)}
      {onViewEvaluation && <button className="member-view-evaluation" type="button" onClick={onViewEvaluation}>
        <span className="material-symbols-outlined" aria-hidden="true">rate_review</span>Xem đánh giá
      </button>}
    </article>
  )
}
