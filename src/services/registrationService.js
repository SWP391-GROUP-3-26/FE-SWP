import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

export function register(payload) {
  return axiosClient.post('/api/auth/register', payload)
}

export function registerMember(payload) {
  return axiosClient.post('/api/receptionist/members', payload, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    timeout: 15000,
  })
}
