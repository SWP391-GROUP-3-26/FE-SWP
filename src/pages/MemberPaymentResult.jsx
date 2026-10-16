import { Link, useSearchParams } from 'react-router-dom'
import { clearAuth } from '../auth/authStorage'
import DashboardLayout from '../components/DashboardLayout'
import memberMenuItems from '../components/memberMenuItems'
import MemberQrPayment from '../components/MemberQrPayment'
import useMemberPayment from '../hooks/useMemberPayment'
import { isValidPaymentId, paymentApiErrorMessage } from '../services/memberPaymentService'
import './MemberActivities.css'

const priceFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

export default function MemberPaymentResult() {
  const [params] = useSearchParams()
  const paymentId = params.get('paymentId')
  const validId = params.getAll('paymentId').length === 1 && isValidPaymentId(paymentId)
  const { payment, error, loading, timedOut, retry } = useMemberPayment(paymentId, validId, 15 * 60_000)
  const review = payment?.paymentStatus === 'Paid' && (payment.requiresReview ||
    !['Đang diễn ra', 'Đã hoàn thành'].includes(payment.bookingStatus))
  const status = payment?.paymentStatus
  const errorStatus = error?.response?.status

  return (
    <DashboardLayout eyebrow="Hội viên / Thanh toán" title="Kết quả thanh toán"
      menuItems={memberMenuItems} role="Hội viên" showIntro={false}>
      <section className="member-page-heading">
        <div>
          <span className="section-heading-kicker">ĐĂNG KÝ LỚP HỌC</span>
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
                review ? <><h3>Đã thanh toán, cần xác nhận đăng ký</h3><p>Trung tâm đã ghi nhận thanh toán nhưng chưa xác nhận lớp. Vui lòng liên hệ trung tâm và cung cấp mã thanh toán {paymentId} để được hỗ trợ.</p></>
                  : <><h3>Thanh toán và đăng ký thành công</h3><p>Lớp đã được ghi nhận trong lịch tập của bạn.</p></>
              ) : status === 'Failed' ? (
                <><h3>Thanh toán không thành công</h3><p>Đăng ký chưa được xác nhận. Bạn có thể quay lại danh sách lớp để đăng ký lại.</p></>
              ) : (
                <><h3>Đang chờ xác nhận thanh toán</h3><p>{timedOut
                  ? 'Chưa nhận được xác nhận cuối cùng. Bạn có thể kiểm tra lại; trạng thái này chưa có nghĩa là thanh toán thất bại.'
                  : 'Hệ thống đang kiểm tra trạng thái khoảng mỗi 3 giây. Vui lòng chờ xác nhận.'}</p></>
              )}
          </div>
        )}
        {!error && status === 'Pending' && payment?.qrPayment && <MemberQrPayment payment={payment} />}
        {payment && <dl className="member-class-details">
          <div><dt>Mã thanh toán</dt><dd>{payment.paymentId}</dd></div>
          <div><dt>Số tiền</dt><dd>{priceFormatter.format(payment.paymentAmount)}</dd></div>
          <div><dt>Đăng ký lớp</dt><dd>{payment.bookingStatus}</dd></div>
        </dl>}
        <div className="member-payment-result-actions">
          {errorStatus === 401 ? <Link className="member-register-button" to="/login" onClick={clearAuth}>Đăng nhập lại</Link>
            : validId && !loading && (timedOut || (error && ![403, 404].includes(errorStatus))) &&
              <button className="member-register-button" type="button" onClick={retry}>Kiểm tra lại</button>}
          {status === 'Paid' && !review && <Link className="member-register-button" to="/member/schedule">Tới lịch tập</Link>}
          <Link className="member-cancel-button" to="/member/classes">Về danh sách lớp</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
