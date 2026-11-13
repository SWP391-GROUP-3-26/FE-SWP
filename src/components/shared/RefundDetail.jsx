import { useState } from 'react'
import Modal from '../common/Modal'
import { saveRefundRecipient, reviewRefund, confirmRefundPayout } from '../../services/refundService'
import { money, financeDate, refundLabel, methodLabel } from '../../utils/finance'
import '../../styles/Finance.css'

export function RefundStatus({ status }) {
  return <span className={`finance-status finance-status-${status.toLowerCase()}`}>{refundLabel(status)}</span>
}

function RecipientForm({ refund, busy, onAction }) {
  return <form className="finance-form" onSubmit={(e) => { e.preventDefault(); onAction(() => saveRefundRecipient(refund.id, { method: 'CASH', version: refund.version }), 'Đã tạo mã nhận tiền tại quầy.') }}>
    <h3>Nhận tiền mặt tại quầy</h3>
    <p className="finance-note">Chỉ hỗ trợ hoàn tiền mặt tại trung tâm. Chọn nhận tại quầy để tạo mã hoàn tiền riêng; đưa mã cho tiếp tân khi đến nhận tiền sau khi yêu cầu được duyệt.</p>
    <div><button type="submit" className="finance-primary" disabled={busy}>Chọn nhận tại quầy và tạo mã</button></div>
  </form>
}

function ReviewForm({ refund, busy, onAction }) {
  const [amount, setAmount] = useState(String(refund.estimatedAmount))
  const [note, setNote] = useState('')
  return <form className="finance-form" onSubmit={(e) => { e.preventDefault(); onAction(() => reviewRefund(refund.id, { status: 'APPROVED', approvedAmount: Number(amount), note, version: refund.version }), 'Đã duyệt yêu cầu, chờ chi trả.') }}>
    <h3>Duyệt hoàn tiền</h3><p className="finance-note">Đối chiếu khoản thực thu và các buổi bị hủy. Nếu điều chỉnh số tiền dự kiến hoặc từ chối, cần ghi rõ lý do.</p>
    <label>Số tiền duyệt hoàn (VND)<input required type="number" min="0.01" max={refund.paidAmount} step="0.01" disabled={busy} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
    <label>Lý do / ghi chú duyệt<textarea maxLength={2000} disabled={busy} value={note} onChange={(e) => setNote(e.target.value)} /></label>
    <div className="finance-actions"><button className="finance-primary" type="submit" disabled={busy}>Duyệt hoàn tiền</button>
      <button type="button" disabled={busy || !note.trim()} onClick={() => onAction(() => reviewRefund(refund.id, { status: 'REJECTED', note, version: refund.version }), 'Đã từ chối yêu cầu.')}>Từ chối và gửi lý do</button></div>
  </form>
}

function PayoutForm({ refund, busy, onAction }) {
  const [pickupCode, setPickupCode] = useState('')
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  async function confirmPayout() {
    if (busy) return
    await onAction(() => confirmRefundPayout(refund.id, { pickupCode, note, version: refund.version }), 'Đã ghi nhận chi trả hoàn tiền thành công.')
    setConfirming(false)
  }
  return <><form className="finance-form" onSubmit={(e) => {
    e.preventDefault()
    if (!busy && refund.pickupReady) setConfirming(true)
  }}><h3>Xác nhận chi trả</h3>
    <p className="finance-note">Nhập mã hoàn tiền do member cung cấp khi đến quầy. Mã phải đúng với đơn đã duyệt và chỉ nhận tiền được một lần; biên nhận được hệ thống lập sau khi xác nhận thành công.</p>
    {!refund.pickupReady && <p role="status">Đang chờ member chọn nhận tiền tại quầy và tạo mã hoàn tiền.</p>}
    <label>Mã hoàn tiền của member<input required name="refundPickupCode" autoComplete="off" spellCheck={false} maxLength={64} disabled={busy} value={pickupCode} placeholder="HT-XXXX-XXXX-XXXX-XXXX" onChange={(e) => setPickupCode(e.target.value)} /></label>
    <label>Ghi chú chi trả<textarea maxLength={1000} disabled={busy} value={note} onChange={(e) => setNote(e.target.value)} /></label>
    <div><button className="finance-primary" type="submit" disabled={busy || !refund.pickupReady}>Xác nhận hoàn tiền tại quầy</button></div>
  </form>
    {confirming && <Modal title="Xác nhận hoàn tiền tại quầy" className="finance-refund-confirm" busy={busy} onClose={() => setConfirming(false)}>
      <p>Kiểm tra thông tin trước khi xác nhận chi trả tiền mặt cho học viên.</p>
      <div className="finance-refund-confirm-amount"><span>Số tiền hoàn</span><strong>{money(refund.approvedAmount)}</strong></div>
      <dl className="finance-refund-confirm-details">
        <div><dt>Học viên</dt><dd>{refund.memberName}</dd></div>
        <div><dt>Lớp học</dt><dd>{refund.itemName}</dd></div>
        <div><dt>Yêu cầu hoàn</dt><dd>#HT-{refund.id}</dd></div>
        <div><dt>Phương thức</dt><dd>Tiền mặt tại quầy</dd></div>
      </dl>
      <p className="finance-note">Hệ thống chỉ chấp nhận khi mã hoàn tiền khớp với yêu cầu này. Mỗi yêu cầu chỉ được nhận tiền một lần.</p>
      <div className="finance-actions">
        <button type="button" disabled={busy} onClick={() => setConfirming(false)}>Quay lại</button>
        <button className="finance-primary" type="button" disabled={busy} onClick={() => void confirmPayout()}>{busy ? 'Đang xác nhận...' : 'Xác nhận chi trả'}</button>
      </div>
    </Modal>}
  </>
}

export default function RefundDetail({ refund, audience = 'member', busy, onAction }) {
  const stages = refund.status === 'REJECTED' ? ['PENDING', 'REJECTED'] : ['PENDING', 'APPROVED', 'PAID']
  return <section className="finance-panel" aria-labelledby="refund-detail-title">
    <header className="finance-header"><h2 id="refund-detail-title">Yêu cầu hoàn tiền #HT-{refund.id}</h2><RefundStatus status={refund.status} /></header>
    <ol className="finance-timeline" aria-label="Tiến trình hoàn tiền">{stages.map((stage) => <li key={stage} className={stage === refund.status ? 'is-current' : ''} aria-current={stage === refund.status ? 'step' : undefined}>{refundLabel(stage)}</li>)}</ol>
    <dl className="finance-grid">
      <div><dt>Học viên / dịch vụ</dt><dd>{refund.memberName} · {refund.itemName}</dd><dt>Thanh toán gốc</dt><dd>#PAY-{refund.paymentId}</dd></div>
      <div><dt>Đã thu</dt><dd>{money(refund.paidAmount)}</dd><dt>Buổi bị hủy / tổng buổi</dt><dd>{refund.cancelledSessions} / {refund.totalSessions}</dd></div>
      <div><dt>Dự kiến hoàn</dt><dd>{money(refund.estimatedAmount)}</dd><dt>Được duyệt hoàn</dt><dd>{money(refund.approvedAmount)}</dd></div>
      <div><dt>Ngày yêu cầu</dt><dd>{financeDate(refund.createdAt)}</dd><dt>Người duyệt / thời gian</dt><dd>{refund.reviewedBy ? `${refund.reviewedBy} · ${financeDate(refund.reviewedAt)}` : 'Chưa duyệt'}</dd></div>
    </dl>
    <p className="finance-note">{refund.reason}</p>
    {refund.reviewNote && <p><strong>{refund.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú duyệt'}:</strong> {refund.reviewNote}</p>}
    <details><summary>Các buổi tại thời điểm hủy</summary><ul>{refund.sessions.map((session) => <li key={session.sessionId}>{session.date.split('-').reverse().join('/')} · {session.startTime?.slice(0, 5)} — {session.refundable ? 'Buổi bị hủy, được tính dự kiến hoàn' : 'Giữ lại, không tính hoàn'}</li>)}</ul></details>
    <section className="finance-panel"><h3>Nhận và chi trả tiền hoàn</h3>
      <p><strong>Phương thức:</strong> {refund.status === 'PAID' ? methodLabel(refund.payoutMethod) : 'Tiền mặt tại quầy'}</p>
      {refund.status === 'PAID' && refund.payoutMethod === 'BANK' && <p>{refund.bankName} · {refund.accountNumber} · {refund.accountHolder}</p>}
      {refund.status === 'PAID' && <><p><strong>Đã hoàn:</strong> {money(refund.approvedAmount)} · {financeDate(refund.paidAt)}</p><p><strong>Người chi:</strong> {refund.paidBy}</p><p><strong>Biên nhận:</strong> {refund.payoutReference}</p>{refund.payoutNote && <p>{refund.payoutNote}</p>}</>}
      {audience === 'member' && refund.status === 'PENDING' && <p className="finance-note">Yêu cầu đang chờ quản lý duyệt. Bạn có thể tạo mã nhận tiền sau khi yêu cầu được duyệt.</p>}
      {audience === 'member' && refund.status === 'APPROVED' && (refund.pickupCode
        ? <div className="finance-note"><h3>Mã nhận tiền tại quầy</h3><strong className="finance-pickup-code">{refund.pickupCode}</strong><p>Chỉ đưa mã cho tiếp tân khi bạn đến nhận tiền. Yêu cầu đã được duyệt, bạn có thể đến quầy nhận tiền.</p></div>
        : <RecipientForm key={`${refund.id}-${refund.version}`} refund={refund} busy={busy} onAction={onAction} />)}
      {audience === 'manager' && refund.status === 'PENDING' && <ReviewForm key={`${refund.id}-${refund.version}`} refund={refund} busy={busy} onAction={onAction} />}
      {audience === 'receptionist' && refund.status === 'APPROVED' && <PayoutForm key={`${refund.id}-${refund.version}`} refund={refund} busy={busy} onAction={onAction} />}
    </section>
  </section>
}
