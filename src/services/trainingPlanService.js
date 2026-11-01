import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

function config(signal) {
  return { signal, timeout: 15000, headers: { Authorization: `Bearer ${getAccessToken()}` } }
}

async function request(method, url, data, signal) {
  const response = await axiosClient.request({ ...config(signal), method, url, data })
  if (response.data?.success !== true || response.data.data == null) {
    throw new Error(response.data?.message || 'Dữ liệu kế hoạch không hợp lệ.')
  }
  return response.data.data
}

export const getTrainingPlans = (audience, signal) => request('get', `/api/${audience}/training-plans`, undefined, signal)
export const getTrainingPlan = (audience, id, signal) => request('get', `/api/${audience}/training-plans/${encodeURIComponent(id)}`, undefined, signal)
export const saveTrainingPlan = (id, data) => request(id ? 'put' : 'post', `/api/coach/training-plans${id ? `/${encodeURIComponent(id)}` : ''}`, data)
export const reviewTrainingPlan = (id, data) => request('patch', `/api/coach/training-plans/${encodeURIComponent(id)}/review`, data)
export const markTrainingPlanRead = (id, revision, signal) => request('post', `/api/member/training-plans/${encodeURIComponent(id)}/read?revision=${revision}`, undefined, signal)
export const saveTrainingResult = (id, exerciseId, data) => request('put', `/api/member/training-plans/${encodeURIComponent(id)}/exercises/${encodeURIComponent(exerciseId)}/result`, data)
export const getTrainingPlanMembers = (classId, signal) => request('get', `/api/coach/training-plans/eligible-members?classId=${encodeURIComponent(classId)}`, undefined, signal)
export const addTrainingPlanRecipients = (id, version) => request('post', `/api/coach/training-plans/${encodeURIComponent(id)}/recipients`, { version })
export const reviewTrainingPlanRecipient = (id, memberId, data) => request('patch', `/api/coach/training-plans/${encodeURIComponent(id)}/recipients/${encodeURIComponent(memberId)}/feedback`, data)

export function trainingPlanError(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  return error.response?.data?.message || (error.request ? 'Không thể kết nối máy chủ. Vui lòng thử lại.' : error.message) || 'Không thể xử lý kế hoạch tập luyện.'
}
