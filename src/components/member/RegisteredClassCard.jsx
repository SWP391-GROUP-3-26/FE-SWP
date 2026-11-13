import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import usePaymentDeadline from '../../hooks/usePaymentDeadline'

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

export default function RegisteredClassCard({ item, busy, onDetail, onCancel, onRebook, onRefresh, paymentBasePath = '/member' }) {
  const pending = item.rawStatus === 'Pending' && item.paymentStatus === 'Pending'
  const deadline = usePaymentDeadline(item.paymentExpiresAt, pending)
  const refreshed = useRef(null)
  useEffect(() => {
    if (pending && item.paymentExpiresAt && deadline.expired && refreshed.current !== item.paymentId && onRefresh) {
      refreshed.current = item.paymentId
      onRefresh()
    }
  }, [pending, item.paymentExpiresAt, item.paymentId, deadline.expired, onRefresh])
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
        {pending && !deadline.expired && <div className="member-pending-payment-info">
          <small>Còn thanh toán: {money.format(item.paymentAmount || 0)}</small>
          <small>Còn {deadline.remaining} để thanh toán</small>
        </div>}
      </td>
      <td data-label="Thao tác">
        <div className="member-class-row-actions">
          {pending && item.canResumePayment && !deadline.expired && item.paymentId && <Link className="member-row-action member-row-action-primary"
            to={`${paymentBasePath}/payment-result?paymentId=${item.paymentId}`}>Tiếp tục thanh toán</Link>}
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
