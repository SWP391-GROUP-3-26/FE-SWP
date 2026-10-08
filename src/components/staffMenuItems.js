import { ROLES } from '../auth/roleConfig'

export const staffMenuItems = {
  [ROLES.CENTER_MANAGER]: [
    { icon: 'dashboard', label: 'Tổng quan trung tâm', route: '/center-manager' },
    { icon: 'menu_book', label: 'Môn học', route: '/subjects' },
    { icon: 'analytics', label: 'Báo cáo', route: '/center-manager' },
    { icon: 'groups', label: 'Nhân sự', route: '/center-manager' },
    { icon: 'settings', label: 'Cấu hình', route: '/center-manager' },
  ],
  [ROLES.RECEPTIONIST]: [
    { icon: 'home', label: 'Tong quan tiep tan', route: '/receptionist' },
    { icon: 'menu_book', label: 'Môn học', route: '/subjects' },
    { icon: 'event_available', label: 'Lich hen', route: '/receptionist' },
    { icon: 'person_add', label: 'Hoi vien', route: '/receptionist' },
    { icon: 'payments', label: 'Thanh toan', route: '/receptionist' },
  ],
}
