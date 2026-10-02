export const ROLE_IDS = {
  CENTER_MANAGER: '1',
  RECEPTIONIST: '2',
  COACH: '3',
}

export const ROLE_CONFIG = {
  [ROLE_IDS.CENTER_MANAGER]: {
    label: 'Center Manager',
    backendRoleName: 'Admin',
    route: '/center-manager',
  },
  [ROLE_IDS.RECEPTIONIST]: {
    label: 'Receptionist',
    backendRoleName: 'Receptionist',
    route: '/receptionist',
  },
  [ROLE_IDS.COACH]: {
    label: 'Coach',
    backendRoleName: 'Coach',
    route: '/coach',
  },
}

export function getRouteForRoleId(roleId) {
  return ROLE_CONFIG[String(roleId)]?.route || '/'
}

export function getRoleIdForRoleName(roleName) {
  const normalizedRoleName = String(roleName || '').toLowerCase()
  const match = Object.entries(ROLE_CONFIG).find(
    ([, config]) => config.backendRoleName.toLowerCase() === normalizedRoleName
  )

  return match?.[0]
}

export function isAllowedRole(roleId, allowedRoleIds) {
  return allowedRoleIds.map(String).includes(String(roleId))
}
