import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

export function memberPackageApiErrorMessage(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Chỉ tài khoản hội viên đang hoạt động mới sử dụng được chức năng này.'
  if (error.response?.status === 404) return 'Không tìm thấy API hoặc gói tập. Vui lòng kiểm tra backend.'
  if (error.response?.status >= 500) return 'Backend gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.'
  if (error.response?.data?.message) return error.response.data.message
  if (error.request) return 'Không thể kết nối backend. Hãy kiểm tra máy chủ hoặc cấu hình CORS.'
  return error.response?.data?.message || error.message || 'Không thể thực hiện yêu cầu về gói tập.'
}

function authConfig(signal) {
  const token = getAccessToken()
  return {
    ...(signal ? { signal } : {}),
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }
}

function validateListResponse(body, name) {
  if (body?.success !== true || !Array.isArray(body.data)) {
    throw new Error(body?.message || `Dữ liệu ${name} từ backend không hợp lệ.`)
  }
  return body
}

export async function getMemberPackageCatalog({
  search = '',
  page = 0,
  size = 20,
  signal,
} = {}) {
  const response = await axiosClient.get('/api/member/packages', {
    ...authConfig(signal),
    params: { ...(search.trim() ? { search: search.trim() } : {}), page, size },
  })
  const body = validateListResponse(response.data, 'danh sách gói tập')
  if (!Number.isFinite(body.total) || !Number.isInteger(body.page) || !Number.isInteger(body.size)) {
    throw new Error('Thông tin phân trang gói tập từ backend không hợp lệ.')
  }
  return body
}

export async function getMemberPackage(packageId, { signal } = {}) {
  const response = await axiosClient.get(`/api/member/packages/${encodeURIComponent(packageId)}`, authConfig(signal))
  if (response.data?.success !== true || !response.data?.data) {
    throw new Error(response.data?.message || 'Không thể tải chi tiết gói tập.')
  }
  return response.data.data
}

export async function getMemberPackageRenewalOverview({ signal } = {}) {
  const response = await axiosClient.get('/api/member/packages/renewal', authConfig(signal))
  if (response.data?.success !== true || !Array.isArray(response.data?.availablePackages)) {
    throw new Error(response.data?.message || 'Thông tin gia hạn từ backend không hợp lệ.')
  }
  return response.data
}

export async function previewMemberPackageRenewal(payload) {
  const response = await axiosClient.post('/api/member/packages/renewal/preview', payload, authConfig())
  if (response.data?.success !== true || !response.data?.selectedPackage) {
    throw new Error(response.data?.message || 'Không thể xem trước thông tin gia hạn.')
  }
  return response.data
}

export async function getMyMemberPackageSubscriptions({ page = 0, size = 100, signal } = {}) {
  const response = await axiosClient.get('/api/member/packages/subscriptions', {
    ...authConfig(signal),
    params: { page, size },
  })
  return validateListResponse(response.data, 'lịch sử gói tập')
}

export async function getMemberPackageDetail(packageId) {
  const response = await axiosClient.get(`/api/member/packages/${encodeURIComponent(packageId)}`, authConfig())
  if (response.data?.success !== true || response.data.data?.id !== Number(packageId)
    || !Array.isArray(response.data.data?.choiceGroups)) throw new Error('Không thể tải chi tiết gói tập. Vui lòng thử lại.')
  return response.data.data
}

export async function registerMemberPackage(payload) {
  if (!['Card', 'E_Wallet'].includes(payload.paymentMethod)) throw new Error('Hội viên chỉ thanh toán qua VNPay hoặc QR chuyển khoản.')
  const response = await axiosClient.post(
    '/api/member/packages/register',
    payload,
    authConfig(),
  )
  if (response.data?.success !== true || !response.data?.data?.paymentId || response.data.data.paymentStatus !== 'Pending') {
    throw new Error(response.data?.message || 'Đăng ký gói tập không thành công.')
  }
  return response.data
}

export async function renewMemberPackage(payload) {
  const response = await axiosClient.post('/api/member/packages/renewal', payload, authConfig())
  if (response.data?.success !== true || !response.data?.data) {
    throw new Error(response.data?.message || 'Gia hạn gói tập không thành công.')
  }
  return response.data
}
