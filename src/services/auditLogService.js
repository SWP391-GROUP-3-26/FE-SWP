import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

function authConfig(signal) {
  const token = getAccessToken()
  return {
    ...(signal ? { signal } : {}),
    timeout: 20000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }
}

function errorMessage(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền xem nhật ký kiểm toán.'
  if (error.request) return 'Không thể kết nối máy chủ. Vui lòng thử lại.'
  return error.response?.data?.message || error.message || 'Không thể tải nhật ký kiểm toán.'
}

export async function getAuditLogs({ category, action, search, startDate, endDate, page = 0, size = 10 } = {}, signal) {
  try {
    const response = await axiosClient.get('/api/admin/audit-logs', {
      ...authConfig(signal),
      params: {
        category: category || undefined,
        action: action || undefined,
        search: search?.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        size,
      },
    })
    if (response.data?.success !== true || !Array.isArray(response.data.data)) {
      throw new Error(response.data?.message || 'Dữ liệu nhật ký kiểm toán không đúng định dạng.')
    }
    return response.data
  } catch (error) {
    if (!error.response && !error.request) throw error
    throw new Error(errorMessage(error))
  }
}

export async function getAuditLogDetail(id, signal) {
  try {
    const response = await axiosClient.get(`/api/admin/audit-logs/${encodeURIComponent(id)}`, authConfig(signal))
    if (response.data?.success !== true || !response.data.log) {
      throw new Error(response.data?.message || 'Chi tiết nhật ký không đúng định dạng.')
    }
    return response.data.log
  } catch (error) {
    if (!error.response && !error.request) throw error
    throw new Error(errorMessage(error))
  }
}
