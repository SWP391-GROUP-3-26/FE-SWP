const AUTH_KEYS = {
  accessToken: 'accessToken',
  userId: 'userId',
  role: 'role',
  fullName: 'fullName',
  email: 'email',
  username: 'username',
  status: 'status',
}

export function saveAuth({ accessToken, userId, role, fullName, email, username, status }) {
  localStorage.setItem(AUTH_KEYS.accessToken, accessToken)
  localStorage.setItem(AUTH_KEYS.userId, String(userId))
  localStorage.setItem(AUTH_KEYS.role, role)
  localStorage.setItem(AUTH_KEYS.fullName, fullName)
  localStorage.setItem(AUTH_KEYS.email, email)
  localStorage.setItem(AUTH_KEYS.username, username)
  localStorage.setItem(AUTH_KEYS.status, status)
}

export function getAuth() {
  return {
    accessToken: getAccessToken(),
    userId: localStorage.getItem(AUTH_KEYS.userId),
    role: getRole(),
    fullName: localStorage.getItem(AUTH_KEYS.fullName),
    email: localStorage.getItem(AUTH_KEYS.email),
    username: localStorage.getItem(AUTH_KEYS.username),
    status: localStorage.getItem(AUTH_KEYS.status),
  }
}

export function getAccessToken() {
  return localStorage.getItem(AUTH_KEYS.accessToken)
}

export function getRole() {
  return localStorage.getItem(AUTH_KEYS.role)
}

export function clearAuth() {
  Object.values(AUTH_KEYS).forEach((key) => localStorage.removeItem(key))
}
