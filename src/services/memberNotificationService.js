import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

async function request(method, path, signal, params) {
  const { data } = await axiosClient.request({
    method, url: `/api/member/notifications${path}`, signal, params, timeout: 15000,
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  })
  if (!data?.success || !data.data) throw new Error('Invalid notification response')
  return data.data
}

export const getUnreadSummary = signal => request('get', '/unread-count', signal)
export const getNotifications = (page, signal) => request('get', '', signal, { page, size: 10 })
export const markNotificationRead = id => request('put', `/${encodeURIComponent(id)}/read`)
