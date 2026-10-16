import { formatClassDate } from '../utils/classSchedule'

export default function RegisteredClassCard({ item, busy, onDetail, onCancel, onRebook }) {
  return (
    <article className="member-class-card">
      <div className="member-class-card-heading">
        <span className="member-class-code">{item.classCode}</span>
        <span className="member-class-active">{item.status}</span>
      </div>
      <h3>{item.className}</h3>
      <dl className="member-class-details">
        <div><dt>Huấn luyện viên</dt><dd>{item.coachName || 'Chưa cập nhật'}</dd></div>
        <div><dt>Phòng</dt><dd>{item.roomName || 'Chưa cập nhật'}</dd></div>
        <div><dt>Lịch học</dt><dd>{item.schedule} · {item.timeSlot}</dd></div>
        <div><dt>Thời hạn</dt><dd>{formatClassDate(item.startDate)} – {formatClassDate(item.endDate)}</dd></div>
        <div><dt>Số buổi đăng ký</dt><dd>{item.sessionCount ?? item.sessions?.length ?? 1} buổi</dd></div>
        <div><dt>Thanh toán</dt><dd>{item.paymentStatus === 'Package' ? 'Trừ gói hội viên'
          : item.paymentStatus === 'Paid' ? 'Đã thanh toán' : item.paymentStatus === 'Pending' ? 'Chờ thanh toán'
            : item.paymentStatus === 'Failed' ? 'Không thành công' : item.paymentMethod || 'Chưa cập nhật'}</dd></div>
      </dl>
      {item.requiresReview && <p role="note">Thanh toán cần trung tâm kiểm tra. Chưa có xác nhận hoàn tiền.</p>}
      <div className="member-booking-actions">
        <button className="member-cancel-button" type="button" onClick={() => onDetail(item)}>Chi tiết các buổi</button>
        {item.canCancel && <button className="member-cancel-button" disabled={busy} type="button" onClick={() => onCancel(item)}>
          {busy ? 'Đang hủy...' : 'Hủy đăng ký'}</button>}
        {item.canRebook && <button className="member-register-button" disabled={busy} type="button" onClick={() => onRebook(item)}>Đăng ký lại</button>}
      </div>
    </article>
  )
}
