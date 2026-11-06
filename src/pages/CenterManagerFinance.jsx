import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import TablePagination from '../components/TablePagination'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'
import { centerManagerFinanceError, getCenterManagerRevenue } from '../services/centerManagerFinanceService'
import './CenterManagerFinance.css'

const periodOptions = [
  { value: 6, label: '6 tháng gần nhất' },
  { value: 12, label: '12 tháng gần nhất' },
  { value: 24, label: '24 tháng gần nhất' },
]

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function monthLabel(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''))
  if (!match) return value || '—'
  return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' })
    .format(new Date(Number(match[1]), Number(match[2]) - 1, 15))
}

function compactMoney(value) {
  const amount = Number(value || 0)
  if (amount >= 1_000_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(amount / 1_000_000_000)} tỷ`
  if (amount >= 1_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount / 1_000_000)} tr`
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount)
}

function RevenueColumnChart({ rows }) {
  const width = 960
  const height = 300
  const padding = { top: 28, right: 24, bottom: 52, left: 84 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const values = rows.map((row) => Number(row.revenue || 0))
  const maximum = Math.max(...values, 1) * 1.12
  const ticks = Array.from({ length: 5 }, (_, index) => maximum * (4 - index) / 4)
  const slotWidth = plotWidth / Math.max(rows.length, 1)
  const columnWidth = Math.min(64, slotWidth * 0.78)
  const points = rows.map((row, index) => ({
    row,
    value: Number(row.revenue || 0),
    x: padding.left + index * slotWidth + slotWidth / 2,
    y: height - padding.bottom - (Number(row.revenue || 0) / maximum) * plotHeight,
  }))
  return (
    <div className="center-manager-revenue-chart-scroll">
      <svg className="center-manager-revenue-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ cột doanh thu theo tháng">
        <title>Doanh thu theo tháng</title>
        {ticks.map((tick, index) => {
          const y = padding.top + index * plotHeight / 4
          return <g key={index}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="center-manager-chart-grid" />
            <text x={padding.left - 12} y={y + 4} textAnchor="end" className="center-manager-chart-axis-label">{compactMoney(tick)}</text>
          </g>
        })}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} className="center-manager-chart-axis" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="center-manager-chart-axis" />
        {points.map((point) => {
          const { row, value, x: centerX, y } = point
          const barHeight = (value / maximum) * plotHeight
          const x = centerX - columnWidth / 2
          const month = String(row.month || '').slice(5, 7)
          const tooltipWidth = 190
          const tooltipX = Math.max(4, Math.min(width - tooltipWidth - 4, centerX - tooltipWidth / 2))
          const tooltipY = Math.max(4, y - 54)
          return <g key={row.month} className={`center-manager-chart-mark${value > 0 ? ' has-revenue' : ''}`}>
            {value > 0 && <>
              <rect
                x={x}
                y={height - padding.bottom - barHeight}
                width={columnWidth}
                height={Math.max(barHeight, 2)}
                rx="5"
                className="center-manager-chart-column"
                tabIndex="0"
                role="img"
                aria-label={`${monthLabel(row.month)}: ${currency.format(value)}, ${Number(row.paidPaymentCount || 0).toLocaleString('vi-VN')} giao dịch đã thanh toán`}
              >
                <title>{`${monthLabel(row.month)}: ${currency.format(value)} · ${Number(row.paidPaymentCount || 0).toLocaleString('vi-VN')} giao dịch`}</title>
              </rect>
              <g className="center-manager-chart-tooltip" aria-hidden="true">
                <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height="46" rx="7" className="center-manager-chart-tooltip-box" />
                <text x={tooltipX + 12} y={tooltipY + 18} className="center-manager-chart-tooltip-title">{monthLabel(row.month)}</text>
                <text x={tooltipX + 12} y={tooltipY + 36} className="center-manager-chart-tooltip-value">{currency.format(value)} · {Number(row.paidPaymentCount || 0).toLocaleString('vi-VN')} giao dịch</text>
              </g>
            </>}
            <text x={centerX} y={height - 29} textAnchor="middle" className="center-manager-chart-axis-label">
              {month ? `T${Number(month)}` : row.month}
            </text>
            {value > 0 && <text x={centerX} y={height - 12} textAnchor="middle" className="center-manager-chart-count-label">
              {Number(row.paidPaymentCount || 0).toLocaleString('vi-VN')} GD
            </text>}
          </g>
        })}
      </svg>
    </div>
  )
}

export default function CenterManagerFinance({ embedded = false }) {
  const [months, setMonths] = useState(12)
  const [tablePage, setTablePage] = useState(0)
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState({ requestKey: '', rows: [], error: '' })
  const requestKey = `${months}:${reload}`
  const loading = result.requestKey !== requestKey

  useEffect(() => {
    const controller = new AbortController()
    getCenterManagerRevenue(months, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setResult({ requestKey, rows, error: '' })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey, rows: [], error: centerManagerFinanceError(error) })
        }
      })
    return () => controller.abort()
  }, [months, reload, requestKey])

  const receivedRows = result.rows.filter((row) => Number(row.revenue || 0) > 0)
  const totalRevenue = receivedRows.reduce((total, row) => total + Number(row.revenue || 0), 0)
  const paidPaymentCount = receivedRows.reduce((total, row) => total + Number(row.paidPaymentCount || 0), 0)
  const tableRows = [...receivedRows].reverse()
  const tablePageSize = 10
  const tableTotalPages = Math.max(1, Math.ceil(tableRows.length / tablePageSize))
  const currentTablePage = Math.min(tablePage, tableTotalPages - 1)
  const visibleTableRows = tableRows.slice(currentTablePage * tablePageSize, (currentTablePage + 1) * tablePageSize)

  const report = (
    <main className={`center-manager-finance-page${embedded ? ' is-embedded' : ''}`}>
      {!embedded && <header className="center-manager-finance-heading">
        <div>
          <span className="section-heading-kicker">DOANH THU GHI NHẬN</span>
          <h2>Doanh thu theo tháng</h2>
        </div>
        <span className="center-manager-finance-heading-icon material-symbols-outlined" aria-hidden="true">account_balance</span>
      </header>}

      {!embedded && <section className="center-manager-finance-summary" aria-label="Tổng hợp doanh thu trong kỳ">
        <article>
          <span className="material-symbols-outlined" aria-hidden="true">payments</span>
          <div><small>Doanh thu trong kỳ</small><strong>{loading ? 'Đang tải…' : currency.format(totalRevenue)}</strong></div>
        </article>
        <article>
          <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
          <div><small>Giao dịch đã thanh toán</small><strong>{loading ? '—' : paidPaymentCount.toLocaleString('vi-VN')}</strong></div>
        </article>
      </section>}

      <section className="center-manager-finance-panel" aria-labelledby={embedded ? 'center-manager-finance-embedded-title' : 'center-manager-finance-table-title'}>
        <div className="center-manager-finance-toolbar">
          <div>
            <h3 id={embedded ? 'center-manager-finance-embedded-title' : 'center-manager-finance-table-title'}>
              {embedded ? 'Doanh thu đã ghi nhận' : 'Chi tiết doanh thu'}
            </h3>
          </div>
          <div className="center-manager-finance-actions">
            <label>
              <span>Kỳ báo cáo</span>
              <select value={months} onChange={(event) => { setMonths(Number(event.target.value)); setTablePage(0) }}>
                {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button type="button" disabled={loading} onClick={() => { setTablePage(0); setReload((value) => value + 1) }}>
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
              Làm mới
            </button>
          </div>
        </div>

        {result.error && !loading && <div className="center-manager-finance-error" role="alert">
          <span>{result.error}</span>
          <button type="button" onClick={() => setReload((value) => value + 1)}>Thử lại</button>
        </div>}

        {embedded && !loading && !result.error && tableRows.length > 0 && <RevenueColumnChart rows={[...result.rows].sort((a, b) => String(a.month || '').localeCompare(String(b.month || '')))} />}
        {embedded && !loading && !result.error && tableRows.length === 0 && (
          <p className="center-manager-finance-chart-empty" role="status">Chưa có dữ liệu doanh thu trong kỳ này.</p>
        )}
        {!embedded && <div className="center-manager-finance-table-wrap">
          <table className="center-manager-finance-table">
            <thead><tr>
              <th scope="col">Tháng ghi nhận</th>
              <th scope="col">Số giao dịch thành công</th>
              <th scope="col">Doanh thu</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td className="center-manager-finance-empty" colSpan="3" role="status">Đang tải báo cáo doanh thu…</td></tr>}
              {!loading && !result.error && tableRows.length === 0 && (
                <tr><td className="center-manager-finance-empty" colSpan="3">Chưa có dữ liệu doanh thu.</td></tr>
              )}
              {!loading && !result.error && visibleTableRows.map((row) => (
                <tr key={row.month}>
                  <th scope="row">{monthLabel(row.month)}</th>
                  <td>{Number(row.paidPaymentCount || 0).toLocaleString('vi-VN')}</td>
                  <td className="center-manager-finance-amount">{currency.format(Number(row.revenue || 0))}</td>
                </tr>
              ))}
            </tbody>
            {!loading && !result.error && tableRows.length > 0 && <tfoot>
              <tr><th scope="row">Tổng cộng</th><td>{paidPaymentCount.toLocaleString('vi-VN')}</td><td>{currency.format(totalRevenue)}</td></tr>
            </tfoot>}
          </table>
        </div>}
        {!embedded && !loading && !result.error && <TablePagination page={currentTablePage} pageSize={tablePageSize}
          totalItems={tableRows.length} itemLabel="tháng" onPageChange={setTablePage} loading={loading} />}
        <p className="center-manager-finance-note">
          Báo cáo này cộng các giao dịch có trạng thái đã thanh toán; khoản hoàn tiền chưa được khấu trừ khỏi doanh thu.
        </p>
      </section>
    </main>
  )

  if (embedded) return report

  return (
    <DashboardLayout
      className="center-manager-finance-theme"
      eyebrow="Quản lý trung tâm / Báo cáo tài chính"
      menuItems={staffMenuItems[ROLES.CENTER_MANAGER]}
      role="Center Manager"
      roleLabel="Quản lý trung tâm"
      showIntro={false}
      title="Báo cáo tài chính"
    >
      {report}
    </DashboardLayout>
  )
}
