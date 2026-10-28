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
    { icon: 'history', label: 'Nhật ký hoạt động', route: '/center-manager/audit-logs' },
  ],
  [ROLES.RECEPTIONIST]: [
    { icon: 'person_add', label: 'Đăng ký hội viên', route: '/receptionist/members/new' },
    { icon: 'home', label: 'Tổng quan tiếp tân', route: '/receptionist' },
    { icon: 'groups', label: 'Hội viên', route: '/receptionist/members' },
  ],
}
