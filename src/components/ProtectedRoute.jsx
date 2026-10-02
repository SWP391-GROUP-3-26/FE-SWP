import { Navigate } from 'react-router-dom'
import { getAccessToken, getRoleId } from '../auth/authStorage'
import { getRouteForRoleId, isAllowedRole } from '../auth/roleConfig'

export default function ProtectedRoute({ allowedRoleIds, children }) {
  const accessToken = getAccessToken()
  const roleId = getRoleId()

  if (!accessToken) {
    return <Navigate to="/" replace />
  }

  if (!isAllowedRole(roleId, allowedRoleIds)) {
    return <Navigate to={getRouteForRoleId(roleId)} replace />
  }

  return children
}
