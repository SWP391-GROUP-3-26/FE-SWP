import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

export async function getCenterManagerRevenue(months = 12, signal) {
  const token = getAccessToken()
  const response = await axiosClient.get('/api/center-manager/dashboard/revenue', {
    params: { months },
    signal,
    timeout: 20000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (response.data?.success !== true || !Array.isArray(response.data.data)) {
    throw new Error(response.data?.message || 'Dữ liệu báo cáo doanh thu không đúng định dạng.')
  }

  return response.data.data
}

export function centerManagerFinanceError(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền xem báo cáo tài chính.'
  if (error.response?.status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
  if (error.request) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.'
  return error.message || 'Không thể tải báo cáo doanh thu.'
}
