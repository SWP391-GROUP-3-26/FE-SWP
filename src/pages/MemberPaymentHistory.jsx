import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import memberMenuItems from '../components/memberMenuItems'
import RefundDetail, { RefundStatus } from '../components/RefundDetail'
import TablePagination from '../components/TablePagination'
import { getPaymentHistory, getPaymentReceipt, readRefund, financeError } from '../services/refundService'
import { money, financeDate, paymentLabel, methodLabel } from '../utils/finance'

function Receipt({ id }) {
  const [state, setState] = useState({ loading: true, payment: null, error: '' })
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    getPaymentReceipt(id, controller.signal).then(async (payment) => {
      let error = ''
      if (!controller.signal.aborted && payment.refund?.unread) {
        try { payment = { ...payment, refund: await readRefund(payment.refund.id, payment.refund.notificationRevision, controller.signal) } }
        catch (err) { error = `Chưa thể đánh dấu thông báo đã đọc: ${financeError(err)}` }
      }
      if (!controller.signal.aborted) setState({ loading: false, payment, error })
    }).catch((error) => { if (!controller.signal.aborted) setState({ loading: false, payment: null, error: financeError(error) }) })
    return () => controller.abort()
  }, [id, reload])
  async function action(operation, success) {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      const refund = await operation()
      setState((s) => ({ ...s, error: '', payment: { ...s.payment, refund } })); setMessage(success)
    } catch (error) { setState((s) => ({ ...s, error: financeError(error) })) }
    finally { setBusy(false) }
  }
  const p = state.payment
  return <><Link to="/member/payment-history">← Lịch sử thanh toán</Link>
    {state.loading && <p role="status">Đang tải thanh toán...</p>}
    {state.error && <div className="finance-error" role="alert">{state.error} <button disabled={busy} type="button" onClick={() => setReload((n) => n + 1)}>Tải lại</button></div>}
    {message && <div className="finance-success" role="status">{message}</div>}
    {p && <><section className="finance-panel"><header className="finance-header"><div><h2>Thanh toán #PAY-{p.id}</h2><p>{p.itemName}</p></div><span className={`finance-status finance-status-${p.status.toLowerCase()}`}>{paymentLabel(p.status)}</span></header>
      <dl className="finance-grid">
        <div><dt>Dịch vụ</dt><dd>{p.paymentType === 'Class_Booking' ? 'Lớp học' : 'Gói tập'}</dd><dt>Phương thức</dt><dd>{methodLabel(p.method)}</dd></div>
        <div><dt>Giá trước giảm</dt><dd>{money(p.originalAmount)}</dd><dt>Giảm giá</dt><dd>{money(p.discountAmount)}</dd></div>
        <div><dt>Số tiền phải trả</dt><dd>{money(p.amount)}</dd><dt>Thực thu</dt><dd>{money(p.status === 'Paid' ? p.amount : 0)}</dd></div>
        <div><dt>Ngày tạo yêu cầu</dt><dd>{financeDate(p.createdAt)}</dd><dt>Ngày thanh toán thành công</dt><dd>{p.status === 'Paid' && !p.paidAt ? 'Giao dịch cũ chưa lưu thời điểm xác nhận' : p.paidAt ? financeDate(p.paidAt) : 'Chưa thanh toán thành công'}</dd></div>
        <div><dt>Đã hoàn tiền</dt><dd>{money(p.refundedAmount)}</dd><dt>Số tiền còn lại sau hoàn</dt><dd>{money(p.retainedAmount)}</dd></div>
      </dl>
      {p.gatewayReference && <p>Mã giao dịch cổng thanh toán: {p.gatewayReference}</p>}
      {p.requiresReview && !p.refund && <p className="finance-note">Khoản thanh toán cần trung tâm đối soát. Nếu bạn đã hủy lớp, trung tâm sẽ kiểm tra và mở yêu cầu hoàn tiền phù hợp.</p>}
      {!p.refund && !p.requiresReview && <p>Chưa có yêu cầu hoàn tiền cho thanh toán này.</p>}
    </section>{p.refund && <RefundDetail refund={p.refund} busy={busy} onAction={action} />}</>}
  </>
}

function HistoryList() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(0, Number(params.get('page')) || 0)
  const status = params.get('status') || '', type = params.get('type') || '', from = params.get('from') || '', to = params.get('to') || ''
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getPaymentHistory({ page, size: 10, status: status || undefined, type: type || undefined, from: from || undefined, to: to || undefined }, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ loading: false, data, error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, data: null, error: financeError(error) }) })
    return () => controller.abort()
  }, [page, status, type, from, to, reload])
  function filter(name, value) {
    const next = new URLSearchParams(params); next.delete('page')
    if (value) next.set(name, value); else next.delete(name)
    setParams(next)
  }
  const data = state.data
  return <><header className="finance-header"><div><h2>Các khoản thanh toán của bạn</h2></div></header>
    <div className="finance-filters">
      <label>Trạng thái<select aria-label="Lọc trạng thái thanh toán" value={status} onChange={(e) => filter('status', e.target.value)}><option value="">Tất cả</option><option value="Pending">Chờ thanh toán</option><option value="Paid">Thành công</option><option value="Failed">Thất bại</option></select></label>
      <label>Dịch vụ<select aria-label="Lọc dịch vụ" value={type} onChange={(e) => filter('type', e.target.value)}><option value="">Tất cả</option><option value="Class_Booking">Lớp học</option><option value="Subscription">Gói tập</option></select></label>
      <label>Từ ngày<input type="date" value={from} onChange={(e) => filter('from', e.target.value)} /></label><label>Đến ngày<input type="date" value={to} min={from || undefined} onChange={(e) => filter('to', e.target.value)} /></label>
    </div>
    {state.loading && <p role="status">Đang tải lịch sử thanh toán...</p>}
    {state.error && <div className="finance-error" role="alert">{state.error} <button type="button" onClick={() => setReload((n) => n + 1)}>Thử lại</button></div>}
    {data && <section className="finance-panel"><div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Giao dịch / dịch vụ</th><th>Số tiền</th><th>Thanh toán</th><th>Hoàn tiền</th><th>Chi tiết</th></tr></thead>
      <tbody>{data.items.map((p) => <tr key={p.id}><td><strong>#PAY-{p.id}</strong><small>{p.itemName}</small><small>{financeDate(p.createdAt)}</small></td><td>{money(p.amount)}<small>{methodLabel(p.method)}</small></td><td>{paymentLabel(p.status)}</td><td>{p.refund ? <RefundStatus status={p.refund.status} /> : p.requiresReview ? 'Cần đối soát' : 'Chưa yêu cầu'}{p.refund?.status === 'PAID' && <small>{money(p.refundedAmount)}</small>}</td><td><Link to={`/member/payment-history/${p.id}`}>Xem chi tiết</Link></td></tr>)}</tbody></table></div>
      {!data.items.length && <p>Chưa có giao dịch phù hợp.</p>}
      <TablePagination page={page} pageSize={data.size} totalItems={data.total} itemLabel="giao dịch" onPageChange={(nextPage) => { const next = new URLSearchParams(params); next.set('page', nextPage); setParams(next) }} loading={state.loading} />
    </section>}
  </>
}

export default function MemberPaymentHistory() {
  const { id } = useParams()
  const [params] = useSearchParams()
  return <DashboardLayout role="Hội viên" menuItems={memberMenuItems} eyebrow="Hội viên / Lịch sử thanh toán" title={id ? 'Chi tiết thanh toán' : 'Lịch sử thanh toán'} showIntro={false}>
    <main className="finance-page">{id ? <Receipt key={id} id={id} /> : <HistoryList key={params.toString()} />}</main>
  </DashboardLayout>
}
