import { ROLES } from '../auth/roleConfig'

export const staffMenuItems = {
  [ROLES.CENTER_MANAGER]: [
    { icon: 'dashboard', label: 'Tong quan trung tam', route: '/center-manager' },
    { icon: 'menu_book', label: 'Môn học', route: '/subjects' },
    { icon: 'analytics', label: 'Bao cao', route: '/center-manager' },
    { icon: 'groups', label: 'Nhan su', route: '/center-manager' },
    { icon: 'settings', label: 'Cau hinh', route: '/center-manager' },
  ],
  [ROLES.RECEPTIONIST]: [
    { icon: 'person_add', label: 'Đăng ký người dùng', route: '/receptionist/register-member' },
    { icon: 'home', label: 'Tong quan tiep tan', route: '/receptionist' },
    { icon: 'person_add', label: 'Hoi vien', route: '/receptionist' },
    { icon: 'payments', label: 'Thanh toan', route: '/receptionist' },
  ],
}
