import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

function authConfig(signal) {
  const token = getAccessToken()
  return {
    ...(signal ? { signal } : {}),
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }
}

export function coachClassApiErrorMessage(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền xem danh sách lớp này.'
  if (error.response?.status === 404) return 'Không tìm thấy lớp học hoặc API danh sách lớp.'
  if (error.response?.status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
  if (error.request) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.'
  return error.response?.data?.message || error.message || 'Không thể tải danh sách lớp.'
}

export async function getCoachClasses({ search = '', status = 'all', signal } = {}) {
  const response = await axiosClient.get('/api/coach/classes', {
    ...authConfig(signal),
    params: { search: search.trim() || undefined, status: status || 'all' },
  })
  const result = response.data
  if (result?.success !== true || !Array.isArray(result.classes) || !result.counts) {
    throw new Error(result?.message || 'Danh sách lớp từ máy chủ không đúng định dạng.')
  }
  return result
}

export async function getCoachClassDetail(classId, signal) {
  const response = await axiosClient.get(`/api/coach/classes/${encodeURIComponent(classId)}`, authConfig(signal))
  const result = response.data
  if (result?.success !== true || !Array.isArray(result.students)) {
    throw new Error(result?.message || 'Thông tin lớp từ máy chủ không đúng định dạng.')
  }
  return result
}

export async function getCoachClassSessions(classId, signal) {
  const response = await axiosClient.get(
    `/api/coach/classes/${encodeURIComponent(classId)}/sessions`,
    authConfig(signal),
  )
  if (response.data?.success !== true || !Array.isArray(response.data.data)) {
    throw new Error(response.data?.message || 'Không thể tải lịch các buổi học của lớp.')
  }
  return response.data.data
}

export async function getCoachSessionAttendance(classId, sessionId, signal) {
  const response = await axiosClient.get(
    `/api/coach/classes/${encodeURIComponent(classId)}/sessions/${encodeURIComponent(sessionId)}/attendance`,
    authConfig(signal),
  )
  if (response.data?.success !== true || !response.data.data?.session || !Array.isArray(response.data.data.members)) {
    throw new Error(response.data?.message || 'Không thể tải danh sách điểm danh của buổi học.')
  }
  return response.data.data
}

export async function saveCoachSessionAttendance(classId, sessionId, records, signal) {
  const response = await axiosClient.put(
    `/api/coach/classes/${encodeURIComponent(classId)}/sessions/${encodeURIComponent(sessionId)}/attendance`,
    { records },
    authConfig(signal),
  )
  if (response.data?.success !== true || !response.data.data?.session || !Array.isArray(response.data.data.members)) {
    throw new Error(response.data?.message || 'Không thể lưu điểm danh của buổi học.')
  }
  return response.data.data
}

