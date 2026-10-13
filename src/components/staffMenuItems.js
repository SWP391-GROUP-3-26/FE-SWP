import { ROLES } from '../auth/roleConfig'

export const staffMenuItems = {
  [ROLES.CENTER_MANAGER]: [
    { icon: 'dashboard', label: 'Tổng quan trung tâm', route: '/center-manager' },
    { icon: 'groups', label: 'Quản lý người dùng', route: '/center-manager/users' },
    {
      icon: 'widgets',
      label: 'Services',
      children: [
        { icon: 'event_note', label: 'Lớp học', route: '/center-manager/classes' },
        { icon: 'card_membership', label: 'Gói tập', route: '/center-manager/packages' },
        { icon: 'menu_book', label: 'Môn học', route: '/subjects' },
      ],
    },
    { icon: 'history', label: 'Audit log', disabled: true },
  ],
  [ROLES.RECEPTIONIST]: [
    { icon: 'person_add', label: 'Đăng ký người dùng', route: '/receptionist/register-member' },
    { icon: 'home', label: 'Tong quan tiep tan', route: '/receptionist' },
    { icon: 'person_add', label: 'Hoi vien', route: '/receptionist' },
    { icon: 'payments', label: 'Thanh toan', route: '/receptionist' },
  ],
}
