import { Navigate } from 'react-router-dom'
import { getAccessToken, getRole } from '../auth/authStorage'
import { getRouteForRole, isAllowedRole } from '../auth/roleConfig'

export default function ProtectedRoute({ allowedRoles, children }) {
  const accessToken = getAccessToken()
  const role = getRole()

  if (!accessToken) {
    return <Navigate to="/" replace />
  }

  if (!isAllowedRole(role, allowedRoles)) {
    return <Navigate to={getRouteForRole(role)} replace />
  }

  return children
}
