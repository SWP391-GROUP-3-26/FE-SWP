import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

async function request(method, path = '', data, signal) {
  const token = getAccessToken()
  const response = await axiosClient.request({
    method,
    url: `/api/packages${path}`,
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

/** Lấy danh sách gói dịch vụ (tuỳ chọn: search, status) */
export async function getPackages({ search, status } = {}, signal) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status && status !== 'all') params.set('status', status)
  const query = params.toString() ? `?${params}` : ''
  const result = await request('get', query, undefined, signal)
  if (!Array.isArray(result?.data)) throw new Error('Danh sách gói dịch vụ từ máy chủ không hợp lệ.')
  return result
}

/** Lấy chi tiết một gói theo ID */
export async function getPackageById(id, signal) {
  const result = await request('get', `/${encodeURIComponent(id)}`, undefined, signal)
  if (!result?.data || typeof result.data !== 'object' || Array.isArray(result.data)) {
    throw new Error('Thông tin gói dịch vụ từ máy chủ không hợp lệ.')
  }
  return result.data
}

/** Tạo mới gói dịch vụ */
export function createPackage(payload) {
  return request('post', '', payload)
}

/** Cập nhật gói dịch vụ */
export function updatePackage(id, payload) {
  return request('put', `/${encodeURIComponent(id)}`, payload)
}

/** Xoá gói dịch vụ */
export function deletePackage(id) {
  return request('delete', `/${encodeURIComponent(id)}`)
}
