import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

async function request(method, path = '', data, signal) {
  const token = getAccessToken()
  const response = await axiosClient.request({
    method,
    url: `/api/subjects${path}`,
    data,
    signal,
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Không thể thực hiện thao tác.')
  }
  return response.data
}

export async function getSubjects(signal) {
  const result = await request('get', '', undefined, signal)
  if (!Array.isArray(result?.data)) throw new Error('Danh sách môn học từ máy chủ không hợp lệ.')
  return result
}

export async function getSubjectById(id, signal) {
  const result = await request('get', `/${encodeURIComponent(id)}`, undefined, signal)
  if (!result?.data || typeof result.data !== 'object' || Array.isArray(result.data)) {
    throw new Error('Thông tin môn học từ máy chủ không hợp lệ.')
  }
  return result.data
}

export function createSubject({ name, category, description }) {
  return request('post', '', { name, category, description })
}

export function deleteSubject(id) {
  return request('delete', `/${encodeURIComponent(id)}`)
}
