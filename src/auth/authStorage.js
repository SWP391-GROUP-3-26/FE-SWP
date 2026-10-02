const AUTH_KEYS = {
  accessToken: 'accessToken',
  userId: 'userId',
  roleId: 'roleId',
}

export function saveAuth({ accessToken, userId, roleId }) {
  localStorage.setItem(AUTH_KEYS.accessToken, accessToken)
  localStorage.setItem(AUTH_KEYS.userId, String(userId))
  localStorage.setItem(AUTH_KEYS.roleId, String(roleId))
}

export function getAuth() {
  return {
    accessToken: getAccessToken(),
    userId: localStorage.getItem(AUTH_KEYS.userId),
    roleId: getRoleId(),
  }
}

export function getAccessToken() {
  return localStorage.getItem(AUTH_KEYS.accessToken)
}

export function getRoleId() {
  return localStorage.getItem(AUTH_KEYS.roleId)
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEYS.accessToken)
  localStorage.removeItem(AUTH_KEYS.userId)
  localStorage.removeItem(AUTH_KEYS.roleId)
}
