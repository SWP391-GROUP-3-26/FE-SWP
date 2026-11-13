import axiosClient from '../api/axiosClient'

export function register(payload) {
  return axiosClient.post('/api/auth/register', payload)
}
