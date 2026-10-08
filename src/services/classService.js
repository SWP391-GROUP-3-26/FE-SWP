import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

async function request(method, path = '', data, { signal, params } = {}) {
  const token = getAccessToken()
  const response = await axiosClient.request({
    method,
    url: `/api/classes${path}`,
    data,
    params,
    signal,
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Không thể thực hiện thao tác.')
  }
  return response.data
}

export async function getClasses({ search = '', status = '', signal } = {}) {
  const result = await request('get', '', undefined, {
    signal,
    params: { search: search || undefined, status: status || undefined },
  })
  if (!Array.isArray(result?.data)) {
    throw new Error('Danh sách lớp học từ máy chủ không hợp lệ.')
  }
  return result
}

export async function getClassFormOptions(signal) {
  const result = await request('get', '/options', undefined, { signal })
  const options = result?.data
  if (!Array.isArray(options?.subjects) || !Array.isArray(options?.coaches) || !Array.isArray(options?.rooms)) {
    throw new Error('Danh mục tạo lớp học từ máy chủ không hợp lệ.')
  }
  return options
}

export async function getClassById(id, signal) {
  const result = await request('get', `/${encodeURIComponent(id)}`, undefined, { signal })
  if (!result?.data || typeof result.data !== 'object' || Array.isArray(result.data)) {
    throw new Error('Thông tin lớp học từ máy chủ không hợp lệ.')
  }
  return result.data
}

export function createClass(classData) {
  return request('post', '', classData)
}

export function deleteClass(id) {
  return request('delete', `/${encodeURIComponent(id)}`)
}
