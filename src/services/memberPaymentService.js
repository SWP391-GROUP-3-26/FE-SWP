import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

export function isValidPaymentId(value) {
  return typeof value === 'string' && /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2147483647
}

export function getVnpayPaymentUrl(value) {
  try {
    const url = new URL(value)
    if (url.origin === 'https://sandbox.vnpayment.vn' &&
      url.pathname === '/paymentv2/vpcpay.html' && !url.username && !url.password) return url.href
  } catch { /* Reject malformed gateway URLs. */ }
  throw new Error('Không thể mở trang thanh toán. Vui lòng kiểm tra trạng thái đăng ký trước khi thử lại.')
}

export function getSepayQrUrl(value) {
  try {
    const url = new URL(value)
    if (url.origin === 'https://vietqr.app' && url.pathname === '/img' &&
      !url.username && !url.password) return url.href
  } catch { /* Reject malformed QR URLs. */ }
  throw new Error('Không thể tải mã QR thanh toán. Vui lòng kiểm tra lại sau.')
}

export function paymentApiErrorMessage(error) {
  const status = error.response?.status
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để kiểm tra thanh toán.'
  if (status === 403) return 'Bạn không có quyền xem thanh toán này.'
  if (status === 404) return 'Không tìm thấy thanh toán hoặc thanh toán không thuộc tài khoản của bạn.'
  if (status === 503) return 'Dịch vụ thanh toán hiện chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ trung tâm.'
  if (status >= 500) return 'Không thể xử lý thanh toán lúc này. Vui lòng thử lại sau.'
  if (error.response?.data?.message) return error.response.data.message
  if (error.request) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
  return error.message || 'Không thể kiểm tra thanh toán. Vui lòng thử lại.'
}

export async function getMemberPayment(paymentId, { signal, memberId } = {}) {
  if (!isValidPaymentId(paymentId)) throw new Error('Mã thanh toán không hợp lệ.')
  const token = getAccessToken()
  const response = await axiosClient.get(memberId ? `/api/receptionist/registrations/members/${encodeURIComponent(memberId)}/payments/${paymentId}` : `/api/member/payments/${paymentId}`, {
    signal,
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const payment = response.data
  if (payment?.success !== true || payment.paymentId !== Number(paymentId) ||
    !['Pending', 'Paid', 'Failed'].includes(payment.paymentStatus) ||
    typeof payment.paymentAmount !== 'number' || !Number.isFinite(payment.paymentAmount) ||
    payment.paymentAmount < 0 || typeof payment.bookingStatus !== 'string' ||
    typeof payment.requiresReview !== 'boolean') {
    throw new Error('Chưa thể xác nhận trạng thái thanh toán. Vui lòng kiểm tra lại sau.')
  }
  if (payment.qrPayment != null) {
    const qr = payment.qrPayment
    if (typeof qr.testMode !== 'boolean' || typeof qr.bankCode !== 'string' || !qr.bankCode ||
      typeof qr.accountNumber !== 'string' || !qr.accountNumber ||
      typeof qr.accountName !== 'string' || !qr.accountName || qr.paymentCode !== `SWP${payment.paymentId}` ||
      typeof payment.expiresAt !== 'string' || !Number.isFinite(Date.parse(payment.expiresAt))) {
      throw new Error('Thông tin thanh toán QR không hợp lệ. Vui lòng kiểm tra lại sau.')
    }
    getSepayQrUrl(qr.qrUrl)
  }
  return payment
}
