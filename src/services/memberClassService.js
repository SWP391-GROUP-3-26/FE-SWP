import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

export function classApiErrorMessage(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền xem danh sách lớp này.'
  if (error.response?.status === 404) return 'Không tìm thấy API danh sách lớp. Vui lòng kiểm tra backend.'
  if (error.response?.status >= 500) return 'Backend gặp lỗi khi tải danh sách lớp. Vui lòng thử lại sau.'
  if (error.request) return 'Không thể kết nối backend. Hãy kiểm tra máy chủ hoặc cấu hình CORS.'
  return error.response?.data?.message || error.message || 'Không thể tải danh sách lớp.'
}

export async function getAvailableClasses({ search = '', signal } = {}) {
  const token = getAccessToken()
  const response = await axiosClient.get('/api/classes', {
    params: {
      ...(search.trim() ? { search: search.trim() } : {}),
    },
    signal,
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (response.data?.success !== true || !Array.isArray(response.data?.data)) {
    throw new Error(response.data?.message || 'Dữ liệu danh sách lớp từ backend không hợp lệ.')
  }

  return response.data.data.filter((classItem) => {
    const status = String(classItem.status || '').trim().toLocaleLowerCase('vi')
    return status === 'open' || status === 'active'
  })
}
