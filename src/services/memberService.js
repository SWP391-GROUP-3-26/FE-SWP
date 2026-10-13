import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

async function request(path, params, signal) {
  const token = getAccessToken()
  const response = await axiosClient.get(`/api/receptionist/members${path}`, {
    params, signal, timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (response.data?.success !== true) {
    throw new Error(response.data?.message || 'Không thể tải thông tin học viên.')
  }
  return response.data
}

export async function searchMembers(keyword, page = 0, signal) {
  const normalized = keyword.trim()
  if (!normalized) return { data: [], total: 0, page: 0, size: 20 }
  const result = await request('', { keyword: normalized, page, size: 20 }, signal)
  if (!Array.isArray(result.data) || !result.data.every((member) => Number.isInteger(member?.userId))
    || !Number.isInteger(result.total) || result.total < 0
    || !Number.isInteger(result.page) || result.page < 0
    || !Number.isInteger(result.size) || result.size < 1) {
    throw new Error('Danh sách học viên từ máy chủ không hợp lệ.')
  }
  return result
}

export async function getMemberById(id, signal) {
  const result = await request(`/${encodeURIComponent(id)}`, undefined, signal)
  if (!Number.isInteger(result.data?.userId)) {
    throw new Error('Thông tin học viên từ máy chủ không hợp lệ.')
  }
  return result.data
}
