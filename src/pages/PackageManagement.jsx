import DashboardLayout from '../components/DashboardLayout'
import { staffMenuItems } from '../components/staffMenuItems'
import { getRole } from '../auth/authStorage'
import './ServiceManagement.css'

export default function PackageManagement() {
  const role = getRole()

  return (
    <DashboardLayout role={role} menuItems={staffMenuItems[role] || []}
      eyebrow="Dịch vụ / Quản lý gói tập"
      title="Danh sách gói dịch vụ"
      subtitle="Theo dõi danh mục gói tập, thời hạn, giá niêm yết và trạng thái kinh doanh.">
      <div className="service-unavailable" role="status">
        <span className="material-symbols-outlined" aria-hidden="true">info</span>
        <div><strong>Chưa thể tải danh sách gói tập</strong>
          <p>Backend hiện chưa có API hoặc mô hình dữ liệu gói tập. Không có dữ liệu mẫu; các thao tác tạo và cập nhật gói sẽ khả dụng sau khi BE bổ sung API.</p>
        </div>
      </div>
      <section className="dashboard-panel service-panel">
        <div className="panel-heading service-heading">
          <div><h3>Danh sách gói dịch vụ</h3><p>Gói tập và đặc quyền</p></div>
          <button className="subject-button subject-primary" disabled type="button">
            <span className="material-symbols-outlined" aria-hidden="true">add</span>Tạo mới gói tập
          </button>
        </div>
        <div className="service-toolbar">
          <label className="service-search"><span className="visually-hidden">Tìm kiếm gói tập</span>
            <span className="input-wrap"><span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input disabled type="search" placeholder="Tìm theo tên gói, mã PKG hoặc nội dung đặc quyền..." />
            </span>
          </label>
          <label className="service-filter"><span>Thời hạn:</span>
            <select disabled defaultValue=""><option value="">Tất cả kỳ hạn</option></select>
          </label>
          <label className="service-filter"><span>Trạng thái:</span>
            <select disabled defaultValue=""><option value="">Tất cả</option></select>
          </label>
        </div>
        <div className="subject-table-scroll" tabIndex={0} role="region" aria-label="Bảng gói dịch vụ">
          <table className="subject-table service-table">
            <thead><tr>{['Mã gói', 'Tên gói dịch vụ & đặc quyền', 'Thời hạn', 'Đơn giá niêm yết', 'Trạng thái', 'Thao tác'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody><tr><td className="subject-empty" colSpan={6}>
              <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
              <p>Gói tập sẽ hiển thị sau khi Backend cung cấp API quản lý.</p>
            </td></tr></tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  )
}
