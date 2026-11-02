import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import ReceptionistLayout from '../components/ReceptionistLayout'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'
import RefundDetail, { RefundStatus } from '../components/RefundDetail'
import { getRefund, getRefundQueue, createLegacyRefund, financeError } from '../services/refundService'
import { money, financeDate } from '../utils/finance'

function RefundContent({ audience, id }) {
  const navigate = useNavigate()
  const manager = audience === 'center-manager'
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    const promise = id ? getRefund(audience, id, controller.signal) : getRefundQueue(audience, controller.signal)
    promise.then((data) => { if (!controller.signal.aborted) setState({ loading: false, data, error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, data: null, error: financeError(error) }) })
    return () => controller.abort()
  }, [audience, id, reload])
  async function action(operation, success) {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      const data = await operation()
      if (!id) navigate(`/${audience}/refunds/${data.id}`)
      else { setState({ loading: false, data, error: '' }); setMessage(success) }
    } catch (error) { setState((s) => ({ ...s, error: financeError(error) })) }
    finally { setBusy(false) }
  }
  const items = id ? [] : (state.data?.refunds || []).filter((r) => (!status || r.status === status)
    && `${r.memberName} ${r.itemName} ${r.paymentId}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')))
  return <>
    {id ? <Link to={`/${audience}/refunds`}>← Danh sách hoàn tiền</Link> : <header className="finance-header"><div><h2>{manager ? 'Duyệt yêu cầu hoàn tiền' : 'Hoàn tiền tại quầy'}</h2><p>{manager ? 'Kiểm tra khoản thực thu, các buổi đã hủy và số tiền đề nghị.' : 'Chọn đơn đã duyệt và nhập đúng mã hoàn tiền member cung cấp để xác nhận trả tiền mặt tại quầy.'}</p></div></header>}
    {state.loading && <p role="status">Đang tải yêu cầu hoàn tiền...</p>}
    {state.error && <div className="finance-error" role="alert">{state.error} <button type="button" disabled={busy} onClick={() => setReload((n) => n + 1)}>Tải lại</button></div>}
    {message && <div className="finance-success" role="status">{message}</div>}
    {state.data && (id ? <RefundDetail refund={state.data} audience={manager ? 'manager' : 'receptionist'} busy={busy} onAction={action} /> : <>
      <div className="finance-filters"><label>Trạng thái<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tất cả</option><option value="PENDING">Chờ duyệt</option><option value="APPROVED">Chờ chi trả</option><option value="PAID">Đã hoàn tiền</option><option value="REJECTED">Từ chối</option></select></label><label>Tìm học viên / lớp / mã thanh toán<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>
      <section className="finance-panel"><div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Yêu cầu</th><th>Học viên / dịch vụ</th><th>Tiền dự kiến / duyệt</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>{items.map((r) => <tr key={r.id}><td>#HT-{r.id}<small>#PAY-{r.paymentId} · {financeDate(r.createdAt)}</small></td><td>{r.memberName}<small>{r.itemName}</small></td><td>{money(r.estimatedAmount)}<small>Duyệt: {money(r.approvedAmount)}</small></td><td><RefundStatus status={r.status} /></td><td><Link to={`/${audience}/refunds/${r.id}`}>Xem yêu cầu</Link></td></tr>)}</tbody></table></div>{!items.length && <p>Chưa có yêu cầu phù hợp.</p>}</section>
      {manager && state.data.legacyPayments.length > 0 && <section className="finance-panel"><h2>Khoản cũ cần kiểm tra hoàn tiền</h2><p>Các khoản đã thu và có buổi bị hủy nhưng chưa có yêu cầu hoàn tiền. Khi mở yêu cầu, hệ thống dựng lại số buổi từ lịch sử để bạn kiểm tra.</p>
        {state.data.legacyPayments.map((p) => <div className="finance-row" key={p.paymentId}><div><strong>#PAY-{p.paymentId} · {p.memberName}</strong><p>{p.itemName} · Đã thu {money(p.amount)}</p></div><button type="button" disabled={busy} onClick={() => void action(() => createLegacyRefund(p.paymentId), 'Đã tạo yêu cầu từ khoản cần đối soát.')}>Mở yêu cầu hoàn tiền</button></div>)}
      </section>}
    </>)}
  </>
}

export default function StaffRefunds({ audience = 'center-manager' }) {
  const { id } = useParams()
  const content = <main className="finance-page"><RefundContent key={`${audience}-${id || 'list'}`} audience={audience} id={id} /></main>
  if (audience === 'receptionist') return <ReceptionistLayout><div className="finance-header"><Link to="/receptionist">← Tổng quan tiếp tân</Link><h1>Hoàn tiền lớp học</h1></div>{content}</ReceptionistLayout>
  return <DashboardLayout role="Center Manager" roleLabel="Quản lý trung tâm" menuItems={staffMenuItems[ROLES.CENTER_MANAGER]} eyebrow="Quản lý / Hoàn tiền" title="Hoàn tiền lớp học" showIntro={false}>{content}</DashboardLayout>
}
