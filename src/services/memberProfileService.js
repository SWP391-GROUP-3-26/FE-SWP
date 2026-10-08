import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

async function request(method, data, signal) {
  const token = getAccessToken()
  const response = await axiosClient.request({
    method,
    url: '/api/users/me',
    data,
    signal,
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Không thể tải hồ sơ hội viên.')
  }

  const profile = response.data?.data
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error('Thông tin hồ sơ từ máy chủ không hợp lệ.')
  }
  return profile
}

export function getMyProfile(signal) {
  return request('get', undefined, signal)
}

export function updateMyProfile(profile) {
  return request('put', profile)
}
