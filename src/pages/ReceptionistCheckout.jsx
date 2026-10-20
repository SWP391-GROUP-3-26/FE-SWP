import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'
import useMemberRequest from '../hooks/useMemberRequest'
import useMemberPayment from '../hooks/useMemberPayment'
import MemberQrPayment from '../components/MemberQrPayment'
import { formatClassDate } from '../utils/classSchedule'
import { getReceptionistCheckout, registerReceptionistClass, registerReceptionistPackage } from '../services/receptionistRegistrationService'
import { getVnpayPaymentUrl, isValidPaymentId, paymentApiErrorMessage } from '../services/memberPaymentService'
import './ReceptionistCheckout.css'
import './MemberActivities.css'

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const methods = [
  { value: 'E_Wallet', icon: 'qr_code_2', label: 'Mã QR', description: 'Chuyển khoản qua SePay' },
  { value: 'Card', icon: 'credit_card', label: 'Thẻ VNPay', description: 'Thanh toán qua cổng VNPay' },
  { value: 'Cash', icon: 'payments', label: 'Tiền mặt', description: 'Thu trực tiếp tại quầy' },
]

export default function ReceptionistCheckout() {
  const { id, serviceType, serviceId } = useParams()
  return <ReceptionistCheckoutContent key={`${id}/${serviceType}/${serviceId}`} memberId={id} serviceType={serviceType} serviceId={serviceId} />
}

export function ReceptionistCheckoutContent({ memberId, serviceType, serviceId }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const paymentId = params.get('paymentId')
  const hasPayment = params.has('paymentId')
  const validPayment = params.getAll('paymentId').length === 1 && isValidPaymentId(paymentId)
  const paymentRequest = useMemberPayment(paymentId, validPayment, 15 * 60_000, memberId)
  const payment = paymentRequest.payment
  const request = useCallback((signal) => getReceptionistCheckout(memberId, serviceType, serviceId, { signal }), [memberId, serviceType, serviceId])
  const { data, loading, error, retry } = useMemberRequest(request)
  const [method, setMethod] = useState('E_Wallet')
  const [receivedCash, setReceivedCash] = useState(false)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState(null)
  const inFlight = useRef(false)
  const profilePath = `/receptionist/members/${memberId}`
  const isClass = serviceType === 'classes'
  const backPath = `${profilePath}/${isClass ? 'classes' : 'packages'}`
  const member = data?.member
  const item = data?.item
  const pending = data?.subscriptions.find((s) => s.subscriptionStatus === 'Pending' && s.paymentStatus === 'Pending')
  const blockReason = data && (member.status !== 'Active' ? 'Tài khoản hội viên không hoạt động.'
    : isClass ? (!item.canRegister ? item.message : '')
      : member.activePackages.length ? 'Hội viên đang có gói còn hiệu lực. Chỉ có thể mua gói mới sau khi gói hiện tại hết hạn.'
        : pending ? 'Hội viên có giao dịch gói đang chờ thanh toán. Kiểm tra giao dịch trước khi đăng ký thêm.' : '')
  const usingPackage = method === 'PACKAGE'
  const canUsePackage = isClass && item?.canPayWithPackage
  const total = hasPayment && payment ? payment.paymentAmount : usingPackage ? 0 : data?.amount
  const invalidMethod = usingPackage ? !canUsePackage : !methods.some((option) => option.value === method)
  const disabled = loading || Boolean(error || blockReason || invalidMethod || result || hasPayment) || busy || !data || (method === 'Cash' && !receivedCash)

  async function submit(event) {
    event.preventDefault()
    if (disabled || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setSubmitError('')
    try {
      const registration = isClass
        ? await registerReceptionistClass(memberId, Number(serviceId), usingPackage
          ? { paymentMethod: 'PACKAGE' } : { paymentMethod: 'DIRECT', paymentChannel: method })
        : await registerReceptionistPackage(memberId, { packageId: Number(serviceId), paymentMethod: method })
      // Lock this order after a successful POST, even if the gateway response is incomplete.
      setResult(registration)
      if (!usingPackage && method !== 'Cash') {
        if (registration.paymentStatus !== 'Pending' || !isValidPaymentId(String(registration.paymentId))) {
          throw new Error('Yêu cầu đã được gửi nhưng chưa thể mở thanh toán. Hãy kiểm tra đăng ký trong hồ sơ hội viên trước khi thao tác tiếp.')
        }
        if (method === 'Card') window.location.assign(getVnpayPaymentUrl(registration.paymentUrl))
        else navigate(`?paymentId=${registration.paymentId}`, { replace: true })
      } else if (!usingPackage && registration.paymentStatus !== 'Paid') {
        throw new Error('Chưa xác nhận được trạng thái thu tiền. Vui lòng kiểm tra hồ sơ hội viên.')
      }
    } catch (e) { setSubmitError(paymentApiErrorMessage(e)) }
    finally { inFlight.current = false; setBusy(false) }
  }

  return <DashboardLayout eyebrow="Lễ tân / Đăng ký dịch vụ / Thanh toán" title="Thanh toán dịch vụ"
    role="Receptionist" menuItems={staffMenuItems[ROLES.RECEPTIONIST]} showIntro={false}>
    <div className="receptionist-checkout">
      <Link className="back-link" to={backPath}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Quay lại chọn {isClass ? 'lớp' : 'gói'}</Link>
      <header className="checkout-heading">
        <div><span className="section-heading-kicker">ĐĂNG KÝ TẠI QUẦY</span><h2>Thanh toán dịch vụ</h2><p>Kiểm tra thông tin hội viên và dịch vụ trước khi xác nhận.</p></div>
        <span className="checkout-secure"><span className="material-symbols-outlined" aria-hidden="true">verified_user</span>Giao dịch tại quầy</span>
      </header>
      {loading && <div className="checkout-card" role="status">Đang tải thông tin hội viên và dịch vụ…</div>}
      {error && <div className="checkout-notice is-error" role="alert"><p>{paymentApiErrorMessage(error)}</p><button className="checkout-secondary" type="button" onClick={retry}>Thử lại</button></div>}
      {data && <div className="checkout-grid">
        <section className="checkout-card checkout-order" aria-labelledby="checkout-order-title">
          <div className="checkout-card-title"><span className="material-symbols-outlined" aria-hidden="true">receipt_long</span><h3 id="checkout-order-title">Thông tin đăng ký</h3></div>
          <div className="checkout-member">
            <span className="checkout-member-icon material-symbols-outlined" aria-hidden="true">person</span>
            <div><small>HỘI VIÊN ĐĂNG KÝ</small><strong>{member.fullName}</strong><span>Mã hội viên #{member.userId}</span></div>
            <Link to={profilePath}>Xem hồ sơ</Link>
          </div>
          <dl className="checkout-contact"><div><dt>Số điện thoại</dt><dd>{member.phone || 'Chưa cập nhật'}</dd></div><div><dt>Email</dt><dd>{member.email || 'Chưa cập nhật'}</dd></div></dl>
          <div className="checkout-service-heading"><span className="checkout-service-type">{isClass ? 'LỚP HỌC' : 'GÓI HỘI VIÊN'} · #{serviceId}</span><h4>{isClass ? item.className : item.name}</h4>{!isClass && item.description && <p>{item.description}</p>}</div>
          {isClass ? <>
            <dl className="checkout-facts">
              <div><dt>Bộ môn</dt><dd>{item.classInfo.subjectName || 'Chưa cập nhật'}</dd></div>
              <div><dt>Huấn luyện viên</dt><dd>{item.coachName || 'Chưa cập nhật'}</dd></div>
              <div><dt>Phòng tập</dt><dd>{item.roomName || 'Chưa cập nhật'}</dd></div>
              <div><dt>Lịch tập</dt><dd>{item.schedule}</dd></div>
              <div><dt>Thời hạn lớp</dt><dd>{formatClassDate(item.startDate)} – {formatClassDate(item.endDate)}</dd></div>
              <div><dt>Số buổi đăng ký</dt><dd>{item.sessionCount} buổi còn lại</dd></div>
              <div><dt>Chỗ còn lại</dt><dd>{item.classInfo.availableSeats} chỗ</dd></div>
              <div><dt>Tình trạng đăng ký</dt><dd>{item.alreadyRegistered ? 'Đã đăng ký' : 'Chưa đăng ký'}</dd></div>
            </dl>
            <details className="checkout-sessions"><summary>Lịch các buổi được đăng ký ({item.sessions.length})</summary><ul>{item.sessions.map((session) => <li key={session.sessionId}><span>{formatClassDate(session.sessionDate)} · {session.sessionStartTime?.slice(0, 5)}–{session.sessionEndTime?.slice(0, 5)}</span><small>Còn {session.availableSeats} chỗ</small></li>)}</ul></details>
            <div className="checkout-package-note"><strong>{item.packageName || 'Chưa có gói hoạt động'}</strong><p>Còn {item.remainingPackageClasses ?? 0} buổi · Cần dùng {item.requiredPackageClasses} buổi.</p><p>Điều kiện: đủ lượt và gói có hiệu lực đến buổi cuối của lớp.</p>{!canUsePackage && <p>Không thể trừ gói: {item.message}</p>}</div>
          </> : <>
            <dl className="checkout-facts"><div><dt>Thời hạn sử dụng</dt><dd>{item.durationDays} ngày</dd></div><div><dt>Số buổi trong gói</dt><dd>{item.includedClasses} buổi</dd></div></dl>
            {item.benefits && <div className="checkout-service-copy"><h5>Quyền lợi</h5><p>{item.benefits}</p></div>}
            {item.termConditions && <div className="checkout-service-copy"><h5>Điều kiện sử dụng</h5><p>{item.termConditions}</p></div>}
            <p className="checkout-caption">Gói bắt đầu từ ngày đăng ký theo quy định của trung tâm. Ngày hiệu lực được xác nhận sau khi đăng ký thành công.</p>
          </>}
          <dl className="checkout-totals"><div><dt>{isClass ? `Học phí ${item.sessionCount} buổi × ${money.format(item.price)}` : 'Giá gói niêm yết'}</dt><dd>{money.format(data.amount)}</dd></div>{usingPackage && <div><dt>Thanh toán bằng gói hội viên</dt><dd>{item.requiredPackageClasses} buổi</dd></div>}<div className="checkout-total"><dt>Tổng cần thu</dt><dd>{money.format(total)}</dd></div></dl>
        </section>
        <section className="checkout-card checkout-payment" aria-labelledby="checkout-payment-title">
          <div className="checkout-card-title"><span className="material-symbols-outlined" aria-hidden="true">account_balance_wallet</span><h3 id="checkout-payment-title">Phương thức thanh toán</h3></div>
          <p className="checkout-caption">Chọn phương thức phù hợp với hội viên.</p>
          {blockReason && !hasPayment && <div className="checkout-notice" role="alert"><p>{blockReason}</p>{pending?.paymentId && <Link to={`${profilePath}/payment-result?paymentId=${pending.paymentId}`}>Kiểm tra giao dịch đang chờ</Link>}</div>}
          {hasPayment ? <div className="checkout-live-payment">
            {!validPayment ? <p role="alert">Mã thanh toán không hợp lệ. Vui lòng mở lại từ hồ sơ hội viên.</p>
              : paymentRequest.loading ? <p role="status">Đang kiểm tra thanh toán…</p>
                : paymentRequest.error ? <div className="checkout-notice is-error" role="alert"><p>{paymentApiErrorMessage(paymentRequest.error)}</p></div>
                  : payment && <>
                    <div className="checkout-notice" role="status"><strong>{payment.paymentStatus === 'Paid'
                      ? payment.requiresReview || !['Đang diễn ra', 'Đã hoàn thành'].includes(payment.bookingStatus) ? 'Đã nhận thanh toán, cần đối soát đăng ký' : 'Thanh toán và đăng ký thành công'
                      : payment.paymentStatus === 'Failed' ? 'Thanh toán không thành công' : 'Đang chờ xác nhận thanh toán'}</strong><p>{payment.itemName} · Mã thanh toán #{payment.paymentId} · {money.format(payment.paymentAmount)}</p></div>
                    {payment.paymentStatus === 'Pending' && payment.qrPayment && <MemberQrPayment payment={payment} />}
                  </>}
            {validPayment && !paymentRequest.loading && (paymentRequest.timedOut || paymentRequest.error) && <button type="button" className="checkout-secondary" onClick={paymentRequest.retry}>Kiểm tra lại thanh toán</button>}
            {validPayment && <Link className="checkout-secondary checkout-payment-manage" to={`${profilePath}/payment-result?paymentId=${paymentId}`}>Xem trạng thái / Hủy yêu cầu thanh toán</Link>}
            <Link className="checkout-primary" to={profilePath}>Về hồ sơ hội viên</Link>
          </div> : result && !submitError ? <div className="checkout-complete" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">check_circle</span><h4>{result.paymentStatus === 'Pending' ? 'Đang mở cổng thanh toán' : 'Đăng ký thành công'}</h4><p>{result.message || 'Yêu cầu đã được ghi nhận.'}</p>
            {result.subscriptionId && <p>Đăng ký gói #{result.subscriptionId} · {formatClassDate(result.startDate)} – {formatClassDate(result.endDate)}</p>}
            {result.paymentId && <p>Mã thanh toán #{result.paymentId}</p>}
            <Link className="checkout-primary" to={profilePath}>Về hồ sơ hội viên</Link>
          </div> : <form onSubmit={submit} aria-busy={busy}>
            <fieldset className="checkout-methods" disabled={busy || Boolean(blockReason || result)}><legend className="visually-hidden">Chọn phương thức thanh toán</legend>
              {methods.map((option) => <label className={`checkout-method${method === option.value ? ' is-selected' : ''}`} key={option.value}>
                <input type="radio" name="checkoutMethod" value={option.value} checked={method === option.value} onChange={() => { setMethod(option.value); setReceivedCash(false); setSubmitError('') }} />
                <span className="material-symbols-outlined" aria-hidden="true">{option.icon}</span><span><strong>{option.label}</strong><small>{option.description}</small></span>
              </label>)}
              {canUsePackage && <label className={`checkout-method${usingPackage ? ' is-selected' : ''}`}><input type="radio" name="checkoutMethod" value="PACKAGE" checked={usingPackage} onChange={() => { setMethod('PACKAGE'); setReceivedCash(false); setSubmitError('') }} /><span className="material-symbols-outlined" aria-hidden="true">card_membership</span><span><strong>Trừ gói hội viên</strong><small>{item.packageName} · {item.requiredPackageClasses} buổi</small></span></label>}
            </fieldset>
            <div className="checkout-method-detail">
              <span className="material-symbols-outlined" aria-hidden="true">{usingPackage ? 'card_membership' : methods.find((option) => option.value === method)?.icon}</span>
              <h4>{usingPackage ? 'Sử dụng lượt trong gói' : method === 'E_Wallet' ? 'Quét mã, thanh toán thuận tiện' : method === 'Card' ? 'Thanh toán thẻ qua VNPay' : 'Thu tiền mặt tại quầy'}</h4>
              <p>{usingPackage ? `Trừ ${item.requiredPackageClasses} buổi để đăng ký toàn bộ các buổi còn lại của lớp.` : method === 'E_Wallet' ? 'Mã QR được tạo sau khi xác nhận đăng ký. Trang thanh toán sẽ tự cập nhật khi hệ thống nhận được tiền.' : method === 'Card' ? 'Tiếp tục đến VNPay để thanh toán. Đăng ký chỉ được xác nhận sau khi cổng thanh toán báo thành công.' : `Nhận đủ ${money.format(data.amount)} từ hội viên trước khi xác nhận.`}</p>
            </div>
            {method === 'Cash' && <label className="checkout-cash-confirm"><input type="checkbox" checked={receivedCash} disabled={busy || Boolean(blockReason || result)} onChange={(event) => setReceivedCash(event.target.checked)} /><span>Tôi đã nhận đủ {money.format(data.amount)} tiền mặt từ {member.fullName}.</span></label>}
            {submitError && <div className="checkout-notice is-error" role="alert"><p>{submitError}</p>{isValidPaymentId(String(result?.paymentId))
              ? <Link to={`${profilePath}/payment-result?paymentId=${result.paymentId}`}>Kiểm tra giao dịch #{result.paymentId}</Link>
              : <Link to={profilePath}>Kiểm tra hồ sơ hội viên</Link>}</div>}
            <button className="checkout-primary" type="submit" disabled={disabled}>{busy ? 'Đang xử lý…' : usingPackage ? 'Xác nhận đăng ký bằng gói' : method === 'Cash' ? 'Xác nhận đã nhận tiền' : method === 'Card' ? 'Tiếp tục đến VNPay' : 'Tạo mã QR thanh toán'}<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></button>
            <p className="checkout-caption checkout-payment-note">{member.fullName} · Hội viên #{member.userId}<br />Tổng tiền và điều kiện đăng ký được kiểm tra lại khi xác nhận.</p>
          </form>}
        </section>
      </div>}
    </div>
  </DashboardLayout>
}
