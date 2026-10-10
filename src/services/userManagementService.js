import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

function getAuthHeaders() {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getUserManagementOptions(signal) {
  const response = await axiosClient.get('/api/center-manager/users/options', {
    signal,
    timeout: 20000,
    headers: getAuthHeaders(),
  })

  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Không thể tải danh mục người dùng.')
  }

  const roles = Array.isArray(response.data?.data?.roles) ? response.data.data.roles : []
  const statuses = Array.isArray(response.data?.data?.statuses) ? response.data.data.statuses : []
  return { roles, statuses }
}

export async function getManagedUsers(
  { search = '', role = '', status = '', page = 0, size = 20 } = {},
  signal
) {
  const response = await axiosClient.get('/api/center-manager/users', {
    params: {
      search: search || undefined,
      role: role || undefined,
      status: status || undefined,
      page,
      size,
    },
    signal,
    timeout: 20000,
    headers: getAuthHeaders(),
  })

  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Không thể tải danh sách người dùng.')
  }

  const payload = response.data || {}
  return {
    users: Array.isArray(payload.data) ? payload.data : [],
    total: Number(payload.total || 0),
    page: Number(payload.page || 0),
    size: Number(payload.size || size),
    totalPages: Number(payload.totalPages || 0),
  }
}

export async function getManagedUserById(userId, signal) {
  const response = await axiosClient.get(
    `/api/center-manager/users/${encodeURIComponent(userId)}`,
    {
      signal,
      timeout: 20000,
      headers: getAuthHeaders(),
    }
  )

  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Không thể tải thông tin người dùng.')
  }

  const user = response.data?.data
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    throw new Error('Thông tin người dùng từ máy chủ không hợp lệ.')
  }

  return user
}

export async function updateManagedUserStatus(userId, status) {
  const response = await axiosClient.patch(
    `/api/center-manager/users/${encodeURIComponent(userId)}/status`,
    { status },
    {
      timeout: 20000,
      headers: getAuthHeaders(),
    }
  )

  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Không thể cập nhật trạng thái người dùng.')
  }

  const user = response.data?.data
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    throw new Error('Thông tin người dùng sau khi cập nhật không hợp lệ.')
  }

  return user
}
