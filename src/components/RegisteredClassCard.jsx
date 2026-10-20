import { Link } from 'react-router-dom'

export default function RegisteredClassCard({ item, busy, onDetail, onCancel, onRebook, paymentBasePath = '/member' }) {
  return (
    <tr className="member-registration-row">
      <td data-label="Tên lớp">
        <div className="member-registration-name">
          <strong>{item.className}</strong>
          <span>{item.roomName || 'Lớp học đã đăng ký'}</span>
        </div>
      </td>
      <td data-label="Mã lớp"><span className="member-registration-code">{item.classCode || '—'}</span></td>
      <td data-label="Lịch tập">{item.schedule || 'Chưa cập nhật'}</td>
      <td data-label="Khung giờ">{item.timeSlot || 'Chưa cập nhật'}</td>
      <td data-label="Huấn luyện viên">{item.coachName || 'Chưa cập nhật'}</td>
      <td data-label="Trạng thái">
        <span className={`member-registration-status${item.canCancel ? ' is-active' : ''}`}>
          {item.status || 'Chưa xác định'}
        </span>
        {item.requiresReview && <small>Thanh toán cần đối soát, chưa tự hoàn tiền.</small>}
      </td>
      <td data-label="Thao tác">
        <div className="member-class-row-actions">
          {item.paymentStatus === 'Pending' && item.paymentId && <Link className="member-row-action member-row-action-primary"
            to={`${paymentBasePath}/payment-result?paymentId=${item.paymentId}`}>Thanh toán</Link>}
          <button className="member-row-action" type="button" onClick={() => onDetail(item)}>Chi tiết</button>
          {item.canCancel && <button className="member-row-action member-row-action-danger" disabled={busy} type="button" onClick={() => onCancel(item)}>
            {busy ? 'Đang hủy...' : 'Hủy lớp'}
          </button>}
          {item.canRebook && <button className="member-row-action member-row-action-primary" disabled={busy} type="button" onClick={() => onRebook(item)}>
            Đăng ký lại
          </button>}
        </div>
      </td>
    </tr>
  )
}
