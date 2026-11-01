import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

async function request(method, url, data, signal) {
  const response = await axiosClient.request({ method, url, data, signal, timeout: 15000,
    headers: { Authorization: `Bearer ${getAccessToken()}` } })
  if (response.data?.success !== true || response.data.data == null) throw new Error(response.data?.message || 'Dữ liệu đánh giá không hợp lệ.')
  return response.data.data
}
const coachPath = (classId, sessionId) => `/api/coach/classes/${encodeURIComponent(classId)}/sessions/${encodeURIComponent(sessionId)}/evaluations`
export const getCoachSessionEvaluations = (classId, sessionId, signal) => request('get', coachPath(classId, sessionId), undefined, signal)
export const saveSessionEvaluation = (classId, sessionId, memberId, data) => request('put', `${coachPath(classId, sessionId)}/${encodeURIComponent(memberId)}`, data)
export const withdrawSessionEvaluation = (classId, sessionId, memberId, version) => request('post', `${coachPath(classId, sessionId)}/${encodeURIComponent(memberId)}/withdraw`, { version })
export async function getMySessionEvaluations(signal) {
  const data = await request('get', '/api/member/session-evaluations', undefined, signal)
  if (!Array.isArray(data)) throw new Error('Danh sách đánh giá không hợp lệ.')
  return data
}
export const getMySessionEvaluation = (sessionId, signal) => request('get', `/api/member/session-evaluations/${encodeURIComponent(sessionId)}`, undefined, signal)
export function sessionEvaluationError(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền xem hoặc sửa đánh giá này.'
  return error.response?.data?.message || (error.request ? 'Không thể tải đánh giá. Vui lòng thử lại.' : error.message) || 'Không thể xử lý đánh giá.'
}
