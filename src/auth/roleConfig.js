export const ROLES = {
  MEMBER: 'Member',
  RECEPTIONIST: 'Receptionist',
  COACH: 'Coach',
  CENTER_MANAGER: 'Center Manager',
}

export const ROLE_CONFIG = {
  [ROLES.MEMBER]: {
    label: 'Member',
    route: '/member',
  },
  [ROLES.RECEPTIONIST]: {
    label: 'Receptionist',
    route: '/receptionist',
  },
  [ROLES.COACH]: {
    label: 'Coach',
    route: '/coach',
  },
  [ROLES.CENTER_MANAGER]: {
    label: 'Center Manager',
    route: '/center-manager',
  },
}

export function getRouteForRole(role) {
  return ROLE_CONFIG[role]?.route || '/'
}

export function isAllowedRole(role, allowedRoles) {
  return allowedRoles.includes(role)
}
