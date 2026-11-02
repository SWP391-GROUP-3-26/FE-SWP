import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

async function request(method, url, { data, signal, params } = {}) {
  const response = await axiosClient.request({ method, url, data, signal, params, timeout: 15000,
    headers: { Authorization: `Bearer ${getAccessToken()}` } })
  if (response.data?.success !== true || response.data.data == null) throw new Error(response.data?.message || 'Phản hồi thanh toán không hợp lệ.')
  return response.data.data
}
export const getPaymentHistory = (params, signal) => request('get', '/api/member/payment-history', { params, signal })
export const getPaymentReceipt = (id, signal) => request('get', `/api/member/payment-history/${encodeURIComponent(id)}`, { signal })
export const getRefundNotifications = (signal) => request('get', '/api/member/refunds/notifications', { signal })
export const readRefund = (id, revision, signal) => request('post', `/api/member/refunds/${id}/read`, { params: { revision }, signal })
export const saveRefundRecipient = (id, data) => request('put', `/api/member/refunds/${id}/recipient`, { data })
export const getRefundQueue = (audience, signal) => request('get', `/api/${audience}/refunds`, { signal })
export const getRefund = (audience, id, signal) => request('get', `/api/${audience}/refunds/${encodeURIComponent(id)}`, { signal })
export const reviewRefund = (id, data) => request('patch', `/api/center-manager/refunds/${id}/review`, { data })
export const confirmRefundPayout = (id, data) => request('post', `/api/receptionist/refunds/${id}/payout`, { data })
export const createLegacyRefund = (id) => request('post', `/api/center-manager/refunds/payments/${id}`)
export const getCancellationPreview = (bookingId, memberId, signal) => request('get', memberId
  ? `/api/receptionist/registrations/members/${memberId}/classes/bookings/${bookingId}/cancel-preview`
  : `/api/member/classes/bookings/${bookingId}/cancel-preview`, { signal })

export function financeError(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  return error.response?.data?.message || (error.request ? 'Không thể kết nối máy chủ. Vui lòng thử lại.' : error.message) || 'Không thể xử lý thanh toán.'
}
