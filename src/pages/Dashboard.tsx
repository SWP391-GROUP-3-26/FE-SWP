import { Navigate } from 'react-router-dom'
import { getRole } from '../auth/authStorage'
import { getRouteForRole } from '../auth/roleConfig'

export default function Dashboard() {
  return <Navigate to={getRouteForRole(getRole())} replace />
}
