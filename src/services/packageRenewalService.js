import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

function renewalPath(memberId) {
  if (memberId == null) return '/api/member/packages/renewal'
  if (!/^[1-9]\d{0,9}$/.test(String(memberId)) || Number(memberId) > 2147483647) {
    throw new Error('Mã hội viên không hợp lệ.')
  }
  return `/api/receptionist/registrations/members/${memberId}/packages/renewal`
}

async function request(memberId, { payload, preview = false, signal } = {}) {
  const path = renewalPath(memberId) + (preview ? '/preview' : '')
  const token = getAccessToken()
  const config = { signal, timeout: 15000, headers: token ? { Authorization: `Bearer ${token}` } : {} }
  const response = payload === undefined
    ? await axiosClient.get(path, config)
    : await axiosClient.post(path, payload, config)
  if (response.data?.success !== true) {
    throw new Error(response.data?.message || 'Không thể gia hạn gói tập. Vui lòng thử lại.')
  }
  return response.data
}

export async function getPackageRenewalOverview(memberId, signal) {
  const result = await request(memberId, { signal })
  if (!Array.isArray(result.availablePackages)) throw new Error('Danh sách gói gia hạn không hợp lệ.')
  return result
}

export async function previewPackageRenewal(memberId, payload, signal) {
  const result = await request(memberId, { payload, preview: true, signal })
  if (!result.currentSubscription || result.selectedPackage?.id !== payload.packageId
    || result.renewalStart !== payload.renewalStart || !result.newStartDate || !result.newEndDate
    || ![result.listedPrice, result.discountAmount, result.totalAmount].every((amount) =>
      typeof amount === 'number' && Number.isFinite(amount) && amount >= 0)) {
    throw new Error('Thông tin xem trước gia hạn không hợp lệ. Vui lòng thử lại.')
  }
  return result
}

export async function renewPackage(memberId, payload) {
  if (memberId == null && !['Card', 'E_Wallet'].includes(payload.paymentMethod)) {
    throw new Error('Hội viên chỉ thanh toán qua VNPay hoặc QR chuyển khoản.')
  }
  const result = await request(memberId, { payload })
  if (!result.data?.subscriptionId || !result.data?.paymentId) {
    throw new Error('Yêu cầu đã được gửi nhưng chưa xác nhận được kết quả. Hãy kiểm tra lịch sử gói trước khi thao tác lại.')
  }
  if (memberId == null && result.data.paymentStatus !== 'Pending') throw new Error('Chưa tạo được giao dịch chờ thanh toán. Hãy kiểm tra lịch sử gói trước khi thử lại.')
  return result
}
