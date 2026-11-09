import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

async function request(method, path = '', data, { signal, params } = {}) {
  const token = getAccessToken()
  const response = await axiosClient.request({
    method,
    url: `/api/rooms${path}`,
    data,
    params,
    signal,
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (response.data?.success === false) throw new Error(response.data.message || 'Không thể thực hiện thao tác.')
  return response.data
}

export async function getRoomOptions(signal) {
  const result = await request('get', '/options', undefined, { signal })
  if (!Array.isArray(result?.data?.types) || !Array.isArray(result?.data?.statuses)) {
    throw new Error('Danh mục phòng từ máy chủ không hợp lệ.')
  }
  return result.data
}

export async function getRooms({ search = '', status = '', type = '', signal } = {}) {
  const result = await request('get', '', undefined, {
    signal,
    params: { search: search || undefined, status: status || undefined, type: type || undefined },
  })
  if (!Array.isArray(result?.data)) throw new Error('Danh sách phòng từ máy chủ không hợp lệ.')
  return result.data
}

export async function getRoomById(id, signal) {
  const result = await request('get', `/${encodeURIComponent(id)}`, undefined, { signal })
  if (!result?.data || typeof result.data !== 'object') throw new Error('Thông tin phòng từ máy chủ không hợp lệ.')
  return result.data
}

export function createRoom(data) { return request('post', '', data) }
export function updateRoom(id, data) { return request('put', `/${encodeURIComponent(id)}`, data) }
export function updateRoomStatus(id, status) { return request('put', `/${encodeURIComponent(id)}/status`, { status }) }
export function deleteRoom(id) { return request('delete', `/${encodeURIComponent(id)}`) }
