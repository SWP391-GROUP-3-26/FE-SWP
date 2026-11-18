import DashboardLayout from '../../layouts/DashboardLayout'
import { Link } from 'react-router-dom'
import CenterManagerFinance from './CenterManagerFinance'
import { staffMenuItems } from '../../layouts/staffMenuItems'
import { ROLES } from '../../auth/roleConfig'
import { useEffect, useMemo, useState } from 'react'
import axiosClient from '../../api/axiosClient'
import { getAccessToken } from '../../auth/authStorage'
import './CenterManagerDashboard.css'

const statusLabels = {
  active: 'Đang hoạt động',
  open: 'Đang mở đăng ký',
  completed: 'Đã hoàn thành',
  complete: 'Đã hoàn thành',
  closed: 'Đã đóng',
  cancelled: 'Đã hủy',
  cancel: 'Đã hủy',
}
const statusColors = ['#2e7d5b', '#e08a43', '#5688b8', '#9275b5', '#c65d5d', '#8b9b91']

function classStatusLabel(status) {
  const key = String(status || '').trim().toLowerCase()
  return statusLabels[key] || (key ? key[0].toUpperCase() + key.slice(1) : 'Chưa xác định')
}

function ClassStatusChart({ rows }) {
  const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0)
  const segments = useMemo(() => {
    return rows.reduce((result, row, index) => {
      const count = Number(row.count || 0)
      const offset = result.length
        ? result[result.length - 1].offset + (total ? result[result.length - 1].count / total * 100 : 0)
        : 0
      const segment = { ...row, count, offset, color: statusColors[index % statusColors.length] }
      return [...result, segment]
    }, [])
  }, [rows, total])

  if (!total) return <p className="manager-chart-empty">Chưa có dữ liệu lớp học.</p>
  return <div className="manager-status-chart">
    <div className="manager-status-donut" role="img" aria-label={`Tổng cộng ${total} lớp học`} style={{ background: `conic-gradient(${segments.map((s) => `${s.color} ${s.offset}% ${s.offset + s.count / total * 100}%`).join(', ')})` }}>
      <div className="manager-status-donut-center"><strong>{total}</strong><span>lớp học</span></div>
    </div>
    <ul className="manager-status-legend">
      {segments.map((segment) => <li key={segment.status}>
        <span className="manager-status-dot" style={{ '--status-color': segment.color }} />
        <span className="manager-status-name">{classStatusLabel(segment.status)}</span>
        <strong>{segment.count}</strong>
        <small>{Math.round(segment.count / total * 100)}%</small>
      </li>)}
    </ul>
  </div>
}

export default function CenterManagerDashboard() {
  const [classStatuses, setClassStatuses] = useState({ rows: [], loading: true, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    const token = getAccessToken()
    axiosClient.get('/api/center-manager/dashboard/class-statuses', {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(({ data }) => {
      if (data?.success !== true || !Array.isArray(data.data)) throw new Error(data?.message || 'Dữ liệu trạng thái lớp không hợp lệ.')
      setClassStatuses({ rows: data.data, loading: false, error: '' })
    }).catch((error) => {
      if (!controller.signal.aborted) setClassStatuses({ rows: [], loading: false, error: error.response?.status === 403 ? 'Bạn không có quyền xem thống kê lớp học.' : 'Không thể tải thống kê lớp học. Vui lòng thử lại.' })
    })
    return () => controller.abort()
  }, [])

  return (
    <DashboardLayout
      eyebrow="Quản trị trung tâm / Tổng quan"
      menuItems={staffMenuItems[ROLES.CENTER_MANAGER]}
      role="Center Manager"
      roleLabel="Quản lý trung tâm"
      title="Tổng quan quản trị trung tâm"
      className="center-manager-dashboard"
    >
      <div className="dashboard-grid manager-summary">
        <article className="dashboard-card dashboard-card-accent">
          <span className="material-symbols-outlined">monitoring</span>
          <h3>Vận hành</h3>
          <p>Khu vực tổng hợp các chỉ số hoạt động của trung tâm.</p>
        </article>
        <article className="dashboard-card">
          <span className="material-symbols-outlined">groups</span>
          <h3>Nhân sự</h3>
          <p>Khu vực tổng hợp nhân sự và lịch trực.</p>
        </article>
        <Link className="dashboard-card manager-finance-shortcut" to="/center-manager/finances">
          <span className="material-symbols-outlined">paid</span>
          <h3>Doanh thu</h3>
          <p>Xem báo cáo doanh thu theo tháng.</p>
        </Link>
      </div>
      <section className="manager-dashboard-analytics" aria-label="Thống kê hoạt động">
        <article className="manager-analytics-card">
          <div className="manager-analytics-heading"><div><span className="section-heading-kicker">TÌNH HÌNH LỚP HỌC</span><h3>Phân bố lớp theo trạng thái</h3></div><span className="material-symbols-outlined" aria-hidden="true">donut_large</span></div>
          {classStatuses.loading ? <p className="manager-chart-empty" role="status">Đang tải thống kê lớp học…</p> : classStatuses.error ? <p className="manager-chart-empty is-error" role="alert">{classStatuses.error}</p> : <ClassStatusChart rows={classStatuses.rows} />}
        </article>
      </section>
      <section className="dashboard-panel">
        <div className="panel-heading">
          <h3>Báo cáo tài chính</h3>
          <Link className="manager-open-finance-link" to="/center-manager/finances">Mở toàn trang</Link>
        </div>
        <CenterManagerFinance embedded />
      </section>
    </DashboardLayout>
  )
}
