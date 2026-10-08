import DashboardLayout from '../components/DashboardLayout'
import { staffMenuItems } from '../components/staffMenuItems'
import { getRole } from '../auth/authStorage'
import './ServiceManagement.css'

export default function UserManagement() {
  const role = getRole()

  return (
    <DashboardLayout role={role} menuItems={staffMenuItems[role] || []}
      eyebrow="Hệ thống phân quyền & kiểm soát tài khoản"
      title="Quản lý người dùng"
      subtitle="Quản lý tài khoản tiếp tân, huấn luyện viên và hội viên trong trung tâm.">
      <section className="dashboard-panel service-panel user-management-panel">
        <div className="panel-heading service-heading">
          <div><h3>Tài khoản hệ thống</h3><p>Tiếp tân · Huấn luyện viên · Member</p></div>
          <div className="user-management-actions">
            <button className="subject-button" disabled title="Chưa có API xuất danh sách" type="button">
              <span className="material-symbols-outlined" aria-hidden="true">download</span>Xuất danh sách
            </button>
            <button className="subject-button subject-primary" disabled title="Chưa có API tạo tài khoản" type="button">
              <span className="material-symbols-outlined" aria-hidden="true">person_add</span>Thêm tài khoản mới
            </button>
          </div>
        </div>
        <div className="user-management-toolbar">
          <div className="user-management-search-filter">
            <label className="service-search"><span className="visually-hidden">Tìm kiếm tài khoản</span>
            <span className="input-wrap"><span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input disabled type="search" placeholder="Tìm kiếm theo tên, UID, email, số điện thoại..." />
            </span>
            </label>
            <label className="service-filter"><span className="visually-hidden">Lọc trạng thái</span>
              <select disabled defaultValue=""><option value="">Tất cả trạng thái</option><option>Active</option><option>Inactive</option></select>
            </label>
            <button className="subject-button" disabled title="Chưa có API tải dữ liệu" type="button" aria-label="Tải lại danh sách">
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            </button>
          </div>
          <div className="user-role-tabs" aria-label="Lọc người dùng theo vai trò">
            {['Tất cả vai trò', 'Receptionist', 'Coach', 'Member'].map((label, index) => (
              <button className={`user-role-tab${index === 0 ? ' user-role-tab-active' : ''}`} disabled key={label} type="button">
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="subject-table-scroll" tabIndex={0} role="region" aria-label="Bảng người dùng">
          <table className="subject-table service-table">
            <thead><tr>{['UID', 'Thành viên', 'Email liên hệ', 'Số điện thoại', 'Vai trò (Role)', 'Trạng thái', 'Thao tác'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody><tr><td className="subject-empty user-management-empty" colSpan={7}>
              <span className="material-symbols-outlined" aria-hidden="true">manage_accounts</span>
              <strong>Chưa thể tải danh sách người dùng</strong>
              <p>Backend chưa cung cấp API danh sách, tạo tài khoản, cập nhật vai trò hoặc trạng thái. Bảng sẽ hiển thị dữ liệu thật khi các API này sẵn sàng.</p>
            </td></tr></tbody>
          </table>
        </div>
        <div className="service-footer user-management-footer">
          <span>Chưa có dữ liệu để hiển thị</span>
          <div className="service-pagination" aria-label="Phân trang">
            <button className="subject-button" disabled type="button" aria-label="Trang trước">‹</button>
            <button className="subject-button user-page-active" disabled type="button" aria-current="page">1</button>
            <button className="subject-button" disabled type="button" aria-label="Trang sau">›</button>
          </div>
        </div>
      </section>
    </DashboardLayout>
  )
}
