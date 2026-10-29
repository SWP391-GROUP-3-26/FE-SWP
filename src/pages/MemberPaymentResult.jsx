import { Link, useSearchParams } from 'react-router-dom'
import { clearAuth } from '../auth/authStorage'
import DashboardLayout from '../components/DashboardLayout'
import ReceptionistLayout from '../components/ReceptionistLayout'
import memberMenuItems from '../components/memberMenuItems'
import MemberQrPayment from '../components/MemberQrPayment'
import useMemberPayment from '../hooks/useMemberPayment'
import { isValidPaymentId, paymentApiErrorMessage } from '../services/memberPaymentService'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'
import ReceptionistMemberContext from '../components/ReceptionistMemberContext'
import './MemberActivities.css'
import { useRef, useState } from 'react'
import Modal from '../components/Modal'
import { cancelReceptionistPayment } from '../services/receptionistRegistrationService'

const priceFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

export default function MemberPaymentResult({ receptionist = false, memberId = null } = {}) {
  const PageLayout = receptionist ? ReceptionistLayout : DashboardLayout
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const inFlight = useRef(false)
  const [params] = useSearchParams()
  const paymentId = params.get('paymentId')
  const validId = params.getAll('paymentId').length === 1 && isValidPaymentId(paymentId)
  const { payment, error, loading, timedOut, retry } = useMemberPayment(paymentId, validId, 15 * 60_000, memberId)
  const isPackage = payment?.paymentType === 'Subscription' || params.get('type') === 'package'
  const backPath = memberId ? `/receptionist/members/${memberId}` : isPackage ? '/member/packages' : '/member/classes'
  const review = payment?.paymentStatus === 'Paid' && (payment.requiresReview ||
    !['Đang diễn ra', 'Đã hoàn thành', 'Chờ bắt đầu'].includes(payment.bookingStatus))
  const status = payment?.paymentStatus
  const errorStatus = error?.response?.status
  async function cancelPayment() {
    if (inFlight.current) return
    inFlight.current = true
    setCancelling(true)
    setCancelError('')
    try {
      await cancelReceptionistPayment(memberId, paymentId)
      setCancelOpen(false)
      retry()
    } catch (e) { setCancelError(paymentApiErrorMessage(e)); retry() }
    finally { inFlight.current = false; setCancelling(false) }
  }

  return (
    <PageLayout className={receptionist ? 'receptionist-payment-result-page' : undefined} eyebrow={receptionist ? 'Lễ tân / Thanh toán cho hội viên' : 'Hội viên / Thanh toán'} title="Kết quả thanh toán"
      menuItems={receptionist ? staffMenuItems[ROLES.RECEPTIONIST] : memberMenuItems} role={receptionist ? "Receptionist" : "Hội viên"} showIntro={false}>
      {memberId && <ReceptionistMemberContext memberId={memberId} />}
      <section className="member-page-heading">
        <div>
          <span className="section-heading-kicker">{isPackage ? 'GÓI HỘI VIÊN' : 'ĐĂNG KÝ LỚP HỌC'}</span>
          <h2>Kết quả thanh toán</h2>
          <p>Trạng thái thanh toán và đăng ký được xác nhận từ trung tâm.</p>
        </div>
        <span className="member-page-heading-icon material-symbols-outlined" aria-hidden="true">payments</span>
      </section>
      <section className="member-class-card member-payment-result" aria-label="Trạng thái thanh toán" aria-busy={loading}>
        {!validId ? (
          <div role="alert"><h3>Đường dẫn thanh toán không hợp lệ</h3><p>Thiếu mã thanh toán hoặc mã không hợp lệ. Vui lòng mở lại đường dẫn thanh toán của bạn.</p></div>
        ) : error ? (
          <div role="alert"><h3>Chưa thể kiểm tra thanh toán</h3><p>{paymentApiErrorMessage(error)}</p></div>
        ) : (
          <div role="status" aria-live="polite" aria-atomic="true">
            {loading ? <p><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Đang kiểm tra thanh toán...</p>
              : status === 'Paid' ? (
                review ? <><h3>Đã thanh toán, cần xác nhận đăng ký</h3><p>Trung tâm đã ghi nhận thanh toán nhưng chưa xác nhận đăng ký. Vui lòng liên hệ trung tâm và cung cấp mã thanh toán {paymentId} để được hỗ trợ.</p></>
                  : <><h3>Thanh toán và đăng ký thành công</h3><p>{payment.bookingStatus === 'Chờ bắt đầu'
                    ? 'Gói đã được thanh toán và sẽ bắt đầu sau khi gói hiện tại hết hạn.' : 'Đăng ký đã được ghi nhận cho hội viên.'}</p></>
              ) : status === 'Failed' ? (
                <><h3>Thanh toán không thành công</h3><p>Đăng ký chưa được xác nhận. Bạn có thể quay lại danh sách {isPackage ? 'gói' : 'lớp'} để đăng ký lại.</p></>
              ) : (
                <><h3>Đang chờ xác nhận thanh toán</h3><p>{timedOut
                  ? 'Chưa nhận được xác nhận cuối cùng. Bạn có thể kiểm tra lại; trạng thái này chưa có nghĩa là thanh toán thất bại.'
                  : 'Hệ thống đang kiểm tra trạng thái khoảng mỗi 3 giây. Vui lòng chờ xác nhận.'}</p></>
              )}
          </div>
        )}
        {!error && status === 'Pending' && payment?.qrPayment && <MemberQrPayment payment={payment} />}
        {payment && <dl className="member-class-details">
          {payment.memberName && <div><dt>Hội viên</dt><dd>{payment.memberName} · #{payment.memberId}</dd></div>}
          {payment.itemName && <div><dt>Lớp / Gói</dt><dd>{payment.itemName}</dd></div>}
          <div><dt>Mã thanh toán</dt><dd>{payment.paymentId}</dd></div>
          <div><dt>Số tiền</dt><dd>{priceFormatter.format(payment.paymentAmount)}</dd></div>
          <div><dt>Trạng thái đăng ký</dt><dd>{payment.bookingStatus}</dd></div>
        </dl>}
        <div className="member-payment-result-actions">
          {memberId && status === 'Pending' && <button className="member-cancel-button" type="button" onClick={() => setCancelOpen(true)}>Hủy yêu cầu thanh toán</button>}
          {errorStatus === 401 ? <Link className="member-register-button" to="/login" onClick={clearAuth}>Đăng nhập lại</Link>
            : validId && !loading && (timedOut || (error && ![403, 404].includes(errorStatus))) &&
              <button className="member-register-button" type="button" onClick={retry}>Kiểm tra lại</button>}
          {!memberId && !isPackage && status === 'Paid' && !review && <Link className="member-register-button" to="/member/schedule">Tới lịch tập</Link>}
          <Link className="member-cancel-button" to={backPath}>{memberId ? 'Về thông tin hội viên' : isPackage ? 'Về gói tập' : 'Về danh sách lớp'}</Link>
        </div>
      </section>
      {cancelOpen && <Modal title="Hủy yêu cầu thanh toán" busy={cancelling} onClose={() => !cancelling && setCancelOpen(false)}>
        <p>Hội viên: {payment?.memberName} · #{memberId}</p>
        <p>{payment?.itemName} · Thanh toán #{paymentId} · {priceFormatter.format(payment?.paymentAmount || 0)}</p>
        <p>Hủy yêu cầu đang chờ và giải phóng chỗ giữ nếu có. Tiền chuyển đến sau khi hủy cần trung tâm đối soát, chưa tự động hoàn tiền.</p>
        {cancelError && <p role="alert">{cancelError}</p>}
        <div className="member-booking-actions">
          <button className="member-cancel-button" disabled={cancelling} type="button" onClick={() => setCancelOpen(false)}>Đóng</button>
          <button className="member-register-button" disabled={cancelling} type="button" onClick={cancelPayment}>{cancelling ? 'Đang hủy…' : 'Xác nhận hủy yêu cầu'}</button>
        </div>
      </Modal>}
    </PageLayout>
  )
}
