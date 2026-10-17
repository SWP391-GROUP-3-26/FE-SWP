import DashboardLayout from '../components/DashboardLayout'
import coachMenuItems from '../components/coachMenuItems'

export default function CoachDashboard() {
  return (
    <DashboardLayout
      eyebrow="UniSports / Lịch dạy"
      menuItems={coachMenuItems}
      role="Coach"
      roleLabel="Huấn luyện viên"
      subtitle="Theo dõi lịch dạy, các lớp phụ trách và ghi chú tập luyện."
      title="Lịch dạy và danh sách lớp"
    >
      <div className="coach-board">
        <section className="dashboard-panel">
          <div className="panel-heading">
            <h3>Lịch dạy</h3>
            <span>Bản xem trước</span>
          </div>
          <div className="schedule-placeholder">
            <div>06:00</div>
            <div>Yoga cân bằng</div>
            <div>Phòng tập A</div>
          </div>
          <div className="schedule-placeholder muted">
            <div>18:30</div>
            <div>Rèn luyện chức năng</div>
            <div>Khu tập 2</div>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <h3>Danh sách lớp</h3>
            <span>Chưa có dữ liệu</span>
          </div>
          <div className="placeholder-box">Danh sách lớp phụ trách sẽ hiển thị tại đây.</div>
        </section>
      </div>
    </DashboardLayout>
  )
}
