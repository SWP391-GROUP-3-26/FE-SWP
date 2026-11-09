import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { freezeSubscription, getFreezeState, memberFreezeApiErrorMessage, resumeSubscription } from '../services/memberPackageService'

export default function PackageFreezeModal({ subscription, onClose, onRefresh }) {
  const id = subscription.subscriptionId
  const resume = subscription.subscriptionStatus === 'Frozen'
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [months, setMonths] = useState('1')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    getFreezeState(id, controller.signal).then(result => {
      if (!controller.signal.aborted) setState(result)
    }).catch(err => {
      if (!controller.signal.aborted) setError(memberFreezeApiErrorMessage(err))
    })
    return () => controller.abort()
  }, [id])
  const stale = state && (String(state.status).toLowerCase() !== String(subscription.subscriptionStatus).toLowerCase()
  )
  const noAllowance = state && !resume && Number(state.remainingFreezeMonths) < 1
  async function submit(event) {
    event.preventDefault()
    const requestedMonths = Number(months)
    if (!state || stale || lock.current || (!resume && (!Number.isInteger(requestedMonths)
      || requestedMonths < 1 || requestedMonths > Number(state.remainingFreezeMonths)))) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      if (resume) await resumeSubscription(id)
      else await freezeSubscription(id, requestedMonths)
      onRefresh(resume ? 'Đã kết thúc bảo lưu. Thời hạn gói đã được cập nhật.' : 'Đã bảo lưu gói tập.')
    } catch (err) {
      setError(memberFreezeApiErrorMessage(err))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return <Modal className="member-package-modal" title={resume ? 'Tập lại' : 'Bảo lưu gói'} busy={busy} onClose={onClose}>
    <form className="member-renewal-form" onSubmit={submit}>
      <strong>{subscription.packageName}</strong>
      {!state && !error && <p role="status">Đang kiểm tra quyền bảo lưu…</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {stale ? <p>Trạng thái gói đã thay đổi. Hãy cập nhật lại danh sách.</p>
        : noAllowance ? <p role="status">Gói này chưa có hạn mức bảo lưu được ghi nhận. Nếu gói vừa được cấu hình, quyền bảo lưu chỉ áp dụng cho đăng ký mua hoặc gia hạn sau thời điểm cấu hình.</p>
        : state && <>
        {resume ? <p>Nếu tập lại ngay, số tháng bảo lưu đã dùng sẽ không được hoàn lại. Ngày hết hạn chỉ được cộng theo số ngày bảo lưu thực tế đủ 24 giờ.</p>
          : <><label>Số tháng bảo lưu (còn {Number(state.remainingFreezeMonths)} tháng)
            <input type="number" min="1" max={Number(state.remainingFreezeMonths)} step="1" required value={months} disabled={busy}
              onChange={event => setMonths(event.target.value)} /></label>
            {state.freezeTerms && <p>{state.freezeTerms}</p>}</>}
      </>}
      <div className="member-package-modal-actions">
        <button type="button" disabled={busy} onClick={onClose}>Đóng</button>
        {stale || (!state && error) ? <button type="button" onClick={() => onRefresh('')}>Cập nhật lại</button>
          : noAllowance ? null
          : <button className="member-class-search-button" type="submit" disabled={!state || busy}>
            {busy ? 'Đang xử lý…' : resume ? 'Xác nhận tập lại' : 'Xác nhận bảo lưu'}
          </button>}
      </div>
    </form>
  </Modal>
}
