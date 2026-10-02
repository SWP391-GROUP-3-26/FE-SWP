import DashboardLayout from '../components/DashboardLayout'

const menuItems = [
  { icon: 'calendar_month', label: 'Lich day', route: '/coach' },
  { icon: 'groups', label: 'Danh sach lop', route: '/coach' },
  { icon: 'fitness_center', label: 'Ke hoach tap', route: '/coach' },
  { icon: 'insights', label: 'Danh gia', route: '/coach' },
]

export default function CoachDashboard() {
  return (
    <DashboardLayout
      eyebrow="HLV SereneDesk / Lich day"
      menuItems={menuItems}
      role="Coach"
      subtitle="Shell cho huan luyen vien theo doi lich day, lop phu trach va ghi chu tap luyen."
      title="Lich day & Danh sach lop"
    >
      <div className="coach-board">
        <section className="dashboard-panel">
          <div className="panel-heading">
            <h3>Lich day</h3>
            <span>Placeholder</span>
          </div>
          <div className="schedule-placeholder">
            <div>06:00</div>
            <div>Yoga can bang</div>
            <div>Studio A</div>
          </div>
          <div className="schedule-placeholder muted">
            <div>18:30</div>
            <div>Functional Training</div>
            <div>Zone 2</div>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <h3>Danh sach lop</h3>
            <span>Empty state</span>
          </div>
          <div className="placeholder-box">Danh sach lop se lay tu API nghiep vu sau.</div>
        </section>
      </div>
    </DashboardLayout>
  )
}
