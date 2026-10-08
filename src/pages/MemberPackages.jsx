import DashboardLayout from '../components/DashboardLayout'
import memberMenuItems from '../components/memberMenuItems'
import './MemberActivities.css'

function EmptyPackages({ icon, title, children }) {
  return (
    <div className="member-empty-state">
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
      <h4>{title}</h4>
      <p>{children}</p>
    </div>
  )
}

export default function MemberPackages() {
  return (
    <DashboardLayout
      eyebrow="Hội viên / Gói tập"
      menuItems={memberMenuItems}
      role="Hội viên"
      showIntro={false}
      title="Gói tập của tôi"
    >
      <section className="member-page-heading">
        <div>
          <span className="section-heading-kicker">QUYỀN LỢI HỘI VIÊN</span>
          <h2>Gói dịch vụ cá nhân</h2>
          <p>Thông tin gói tập đang sử dụng và các gói dịch vụ sẽ được cập nhật tại đây.</p>
        </div>
        <span className="member-page-heading-icon material-symbols-outlined" aria-hidden="true">card_membership</span>
      </section>

      <section className="member-data-section">
        <div className="member-data-section-heading">
          <div>
            <span className="section-heading-kicker">THẺ HỘI VIÊN</span>
            <h3>Gói tập đang kích hoạt</h3>
          </div>
          <span className="member-data-badge"><span /> Chưa đồng bộ</span>
        </div>
        <EmptyPackages icon="wallet" title="Chưa có dữ liệu gói tập">
          Backend chưa có API tra cứu gói đã mua. Vui lòng thử lại sau khi hệ thống được kết nối.
        </EmptyPackages>
      </section>

      <section className="member-data-section">
        <div className="member-data-section-heading">
          <div>
            <span className="section-heading-kicker">LỰA CHỌN CỦA BẠN</span>
            <h3>Gói dịch vụ có thể mua</h3>
          </div>
        </div>
        <EmptyPackages icon="inventory_2" title="Danh sách gói chưa khả dụng">
          Chưa có API danh sách gói và thanh toán. Không hiển thị gói hoặc giá mẫu để tránh nhầm lẫn.
        </EmptyPackages>
      </section>
    </DashboardLayout>
  )
}
