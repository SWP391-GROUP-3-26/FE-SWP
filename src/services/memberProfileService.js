import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

function authHeaders() {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function profileFromResponse(response) {
  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Không thể tải hồ sơ hội viên.')
  }

  const profile = response.data?.data
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error('Thông tin hồ sơ từ máy chủ không hợp lệ.')
  }
  return profile
}

export function profileErrorMessage(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền xem hồ sơ này.'
  if (error.response?.status === 404) return 'Không tìm thấy API hồ sơ/avatar. Vui lòng kiểm tra cấu hình backend.'
  if (error.response?.status >= 500) return 'Backend gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.'
  if (error.request) return 'Không thể kết nối backend. Hãy kiểm tra máy chủ hoặc cấu hình CORS.'
  return error.response?.data?.message || error.message || 'Không thể xử lý yêu cầu hồ sơ.'
}

export async function getMyProfile(signal) {
  const response = await axiosClient.get('/api/users/me', {
    signal,
    timeout: 15000,
    headers: authHeaders(),
  })
  return profileFromResponse(response)
}

export async function updateMyProfile(payload) {
  const response = await axiosClient.put('/api/users/me', payload, {
    timeout: 15000,
    headers: authHeaders(),
  })
  return profileFromResponse(response)
}

export async function uploadAvatar(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await axiosClient.post('/api/users/me/avatar', formData, {
    timeout: 30000,
    headers: {
      ...authHeaders(),
      'Content-Type': undefined,
    },
  })

  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Không thể tải ảnh đại diện lên.')
  }

  const avatarUrl = response.data?.data?.avatarUrl
  if (typeof avatarUrl !== 'string' || !avatarUrl.trim()) {
    throw new Error('Đường dẫn ảnh đại diện từ máy chủ không hợp lệ.')
  }
  return avatarUrl
}

export function resolveAvatarUrl(avatarUrl) {
  if (typeof avatarUrl !== 'string' || !avatarUrl.trim()) return ''
  const value = avatarUrl.trim()

  try {
    const absoluteUrl = new URL(value)
    return ['http:', 'https:'].includes(absoluteUrl.protocol) ? absoluteUrl.href : ''
  } catch {
    try {
      const apiOrigin = new URL(axiosClient.defaults.baseURL || window.location.origin).origin
      const resolvedUrl = new URL(value, `${apiOrigin}/`)
      return ['http:', 'https:'].includes(resolvedUrl.protocol) ? resolvedUrl.href : ''
    } catch {
      return ''
    }
  }
}
