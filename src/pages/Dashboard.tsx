import { Navigate } from 'react-router-dom'
import { getRoleId } from '../auth/authStorage'
import { getRouteForRoleId } from '../auth/roleConfig'

export default function Dashboard() {
  return <Navigate to={getRouteForRoleId(getRoleId())} replace />
}
