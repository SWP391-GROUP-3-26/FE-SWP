import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'
import { groupGymPackages } from '../utils/gymPackages'

export function memberPackageApiErrorMessage(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Chỉ tài khoản hội viên đang hoạt động mới sử dụng được chức năng này.'
  if (error.response?.status === 404) return 'Không tìm thấy API hoặc gói tập. Vui lòng kiểm tra backend.'
  if (error.response?.status >= 500) return 'Backend gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.'
  if (error.response?.data?.message) return error.response.data.message
  if (error.request) return 'Không thể kết nối backend. Hãy kiểm tra máy chủ hoặc cấu hình CORS.'
  return error.response?.data?.message || error.message || 'Không thể thực hiện yêu cầu về gói tập.'
}

export function memberFreezeApiErrorMessage(error) {
  const status = error.response?.status
  const message = error.response?.data?.message
  if (status === 409) {
    return message || 'Chưa thể bảo lưu lúc này. Hãy kiểm tra lịch lớp trùng thời gian bảo lưu và hoàn tất giao dịch mua hoặc gia hạn đang chờ thanh toán.'
  }
  if (status === 400) return message || 'Số tháng bảo lưu không hợp lệ hoặc vượt quá hạn mức còn lại.'
  if (status === 404) return message || 'Không tìm thấy gói tập của hội viên này.'
  return memberPackageApiErrorMessage(error)
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

export async function getGroupedMemberCatalog({ signal }) {
  const first = await getMemberPackageCatalog({ signal })
  const items = [...first.data]
  for (let page = 1; page * first.size < first.total && first.size > 0; page++) {
    const next = await getMemberPackageCatalog({ page, size: first.size, signal })
    items.push(...next.data)
  }
  const data = groupGymPackages(items)
  return { data, total: data.length }
}

export async function getMyMemberPackageSubscriptions({ page = 0, size = 100, signal } = {}) {
  const response = await axiosClient.get('/api/member/packages/subscriptions', {
    ...authConfig(signal),
    params: { page, size },
  })
  return validateListResponse(response.data, 'lịch sử gói tập')
}

async function freezeRequest(subscriptionId, action, method, data, signal) {
  const response = await axiosClient.request({
    ...authConfig(signal), method, data,
    url: `/api/member/packages/subscriptions/${encodeURIComponent(subscriptionId)}/${action}`,
  })
  const state = response.data
  if (!state?.success || Number(state.subscriptionId) !== Number(subscriptionId) || !state.status) {
    throw new Error(state?.message || 'Không xác nhận được trạng thái bảo lưu.')
  }
  if (state.remainingFreezeMonths == null || !Number.isFinite(Number(state.remainingFreezeMonths))) {
    throw new Error('API bảo lưu chưa trả về hạn mức của gói. Cần cập nhật BE và migration bảo lưu rồi thử lại.')
  }
  return state
}

export const getFreezeState = (id, signal) => freezeRequest(id, 'freeze', 'get', undefined, signal)
export const freezeSubscription = (id, months) => freezeRequest(id, 'freeze', 'post', { months })
export const resumeSubscription = id => freezeRequest(id, 'resume', 'post')

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
