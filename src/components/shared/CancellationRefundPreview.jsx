import { useEffect, useState } from 'react'
import { getCancellationPreview, financeError } from '../../services/refundService'
import { money } from '../../utils/finance'
import '../../styles/Finance.css'

export default function CancellationRefundPreview({ bookingId, memberId, onReady }) {
  const [state, setState] = useState({ data: null, error: '' })
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getCancellationPreview(bookingId, memberId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) { setState({ data, error: '' }); onReady(data) } })
      .catch((error) => { if (!controller.signal.aborted) setState({ data: null, error: financeError(error) }) })
    return () => controller.abort()
  }, [bookingId, memberId, onReady, reload])
  if (state.error) return <div className="finance-error" role="alert">{state.error} <button type="button" onClick={() => { onReady(null); setState({ data: null, error: '' }); setReload((n) => n + 1) }}>Thử lại</button></div>
  if (!state.data) return <p role="status">Đang tính số buổi và khoản hoàn...</p>
  const preview = state.data
  return <div className="finance-preview"><dl>
    <dt>Tổng số buổi đã mua</dt><dd>{preview.totalSessions}</dd>
    <dt>Buổi đã bắt đầu / giữ lại</dt><dd>{preview.totalSessions - preview.cancelSessions}</dd>
    <dt>Buổi tương lai sẽ hủy</dt><dd>{preview.cancelSessions}</dd>
    <dt>Đã thanh toán trực tiếp</dt><dd>{money(preview.paidAmount)}</dd>
    <dt>Dự kiến hoàn tiền</dt><dd>{money(preview.estimatedRefund)}</dd>
  </dl>{preview.usesPackage && <p>Hủy {preview.cancelSessions} buổi đăng ký bằng gói hội viên.</p>}
  <p>{preview.estimatedRefund > 0 ? 'Khoản hoàn chỉ tính trên các buổi trả tiền bị hủy, làm tròn xuống đến đồng. Trung tâm sẽ kiểm tra và duyệt số tiền hoàn.'
      : 'Đăng ký này chưa có khoản tiền đủ điều kiện hoàn.'}</p></div>
}
