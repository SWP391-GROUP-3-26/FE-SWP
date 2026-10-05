import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080'
export const GOOGLE_AUTH_URL = `${API_BASE_URL}/oauth2/authorization/google`

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default axiosClient
