import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRefundNotifications, financeError } from '../../services/refundService'
import { money, refundLabel } from '../../utils/finance'
import '../../styles/Finance.css'
import LocalizedContent from '../common/LocalizedContent'

export default function MemberRefundNotifications() {
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getRefundNotifications(controller.signal)
      .then((items) => { if (!controller.signal.aborted) setState({ loading: false, items, error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, items: [], error: financeError(error) }) })
    return () => controller.abort()
  }, [reload])
  if (!state.loading && !state.error && !state.items.length) return null
  return <LocalizedContent><section className="finance-notices" aria-labelledby="refund-notices-title"><header className="finance-header"><h2 id="refund-notices-title">Cập nhật hoàn tiền {state.items.length > 0 && `(${state.items.length} chưa đọc)`}</h2><Link to="/member/payment-history">Lịch sử thanh toán</Link></header>
    {state.loading && <p role="status">Đang tải thông báo hoàn tiền...</p>}
    {state.error && <div role="alert">{state.error} <button type="button" onClick={() => setReload((n) => n + 1)}>Thử lại</button></div>}
    <ul className="finance-notice-list">{state.items.slice(0, 3).map((refund) => <li key={refund.id}><strong>{refund.itemName} — {refundLabel(refund.status)}</strong>
      <p>{refund.status === 'PENDING' ? `Dự kiến hoàn ${money(refund.estimatedAmount)}. Trung tâm đang kiểm tra yêu cầu.`
        : refund.status === 'REJECTED' ? refund.reviewNote : `${refund.status === 'PAID' ? 'Đã hoàn' : 'Đã duyệt'} ${money(refund.approvedAmount)}.`}</p>
      <Link to={`/member/payment-history/${refund.paymentId}`}>Xem chi tiết hoàn tiền →</Link></li>)}</ul>
  </section></LocalizedContent>
}
