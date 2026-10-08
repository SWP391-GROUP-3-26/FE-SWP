const AUTH_KEYS = {
  accessToken: 'accessToken',
  userId: 'userId',
  role: 'role',
  fullName: 'fullName',
  email: 'email',
  username: 'username',
  status: 'status',
  avatarUrl: 'avatarUrl',
}

export function saveAuth({ accessToken, userId, role, fullName, email, username, status, avatarUrl }) {
  localStorage.setItem(AUTH_KEYS.accessToken, accessToken)
  localStorage.setItem(AUTH_KEYS.userId, String(userId))
  localStorage.setItem(AUTH_KEYS.role, role)
  localStorage.setItem(AUTH_KEYS.fullName, fullName)
  localStorage.setItem(AUTH_KEYS.email, email)
  localStorage.setItem(AUTH_KEYS.username, username)
  localStorage.setItem(AUTH_KEYS.status, status)
  if (avatarUrl) localStorage.setItem(AUTH_KEYS.avatarUrl, avatarUrl)
  else localStorage.removeItem(AUTH_KEYS.avatarUrl)
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
    avatarUrl: localStorage.getItem(AUTH_KEYS.avatarUrl),
  }
}

export function updateAuthProfile({ fullName, email, status, avatarUrl }) {
  if (fullName !== undefined) localStorage.setItem(AUTH_KEYS.fullName, fullName || '')
  if (email !== undefined) localStorage.setItem(AUTH_KEYS.email, email || '')
  if (status !== undefined) localStorage.setItem(AUTH_KEYS.status, status || '')
  if (avatarUrl !== undefined) {
    if (avatarUrl) localStorage.setItem(AUTH_KEYS.avatarUrl, avatarUrl)
    else localStorage.removeItem(AUTH_KEYS.avatarUrl)
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
