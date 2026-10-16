import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

export function classApiErrorMessage(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (error.response?.status === 404) return 'Không tìm thấy API lớp học. Vui lòng kiểm tra backend.'
  if (error.response?.status >= 500) return 'Backend gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.'
  if (error.request) return 'Không thể kết nối backend. Hãy kiểm tra máy chủ hoặc cấu hình CORS.'
  return error.response?.data?.message || error.message || 'Không thể tải danh sách lớp.'
}

export async function getAvailableClasses({ search = '', signal } = {}) {
  const token = getAccessToken()
  const response = await axiosClient.get('/api/member/classes/available', {
    params: {
      ...(search.trim() ? { search: search.trim() } : {}),
    },
    signal,
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (response.data?.success !== true || !Array.isArray(response.data?.classes)) {
    throw new Error(response.data?.message || 'Dữ liệu lớp khả dụng từ backend không hợp lệ.')
  }

  return response.data.classes
}

export async function getMyClassList({ status = 'ongoing', search = '', signal } = {}) {
  const token = getAccessToken()
  const response = await axiosClient.get('/api/member/classes/my-classes', {
    params: { status, ...(search.trim() ? { search: search.trim() } : {}) },
    signal,
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (response.data?.success !== true || !Array.isArray(response.data?.classes)) {
    throw new Error(response.data?.message || 'Dữ liệu lớp đã đăng ký từ backend không hợp lệ.')
  }

  return { classes: response.data.classes, counts: response.data.counts || {} }
}

export async function getMyClasses(options) {
  return (await getMyClassList(options)).classes
}

export async function cancelClassRegistration(bookingId) {
  const token = getAccessToken()
  const response = await axiosClient.post(`/api/member/classes/bookings/${encodeURIComponent(bookingId)}/cancel`, {}, {
    timeout: 15000, headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (response.data?.success !== true) throw new Error(response.data?.message || 'Không thể hủy đăng ký lớp.')
  return response.data
}

export async function getClassConfirmation(classId) {
  const token = getAccessToken()
  const response = await axiosClient.get(`/api/member/classes/${classId}/confirm`, {
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (response.data?.success !== true) {
    throw new Error(response.data?.message || 'Không thể tải thông tin xác nhận lớp học.')
  }

  return response.data
}

export async function registerForClass(classId, payload) {
  if (payload.paymentMethod === 'DIRECT' && !['Card', 'E_Wallet'].includes(payload.paymentChannel)) {
    throw new Error('Vui lòng chọn Thẻ ATM qua VNPay hoặc Ví điện tử.')
  }
  const token = getAccessToken()
  const response = await axiosClient.post(`/api/member/classes/${classId}/register`, payload, {
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (response.data?.success !== true) {
    throw new Error(response.data?.message || 'Đăng ký lớp học không thành công.')
  }

  return response.data
}
