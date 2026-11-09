import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { freezeSubscription, getFreezeState, memberPackageApiErrorMessage, resumeSubscription } from '../services/memberPackageService'

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
      if (!controller.signal.aborted) setError(memberPackageApiErrorMessage(err))
    })
    return () => controller.abort()
  }, [id])
  const stale = state && (state.status !== subscription.subscriptionStatus || (!resume && state.remainingFreezeMonths < 1))
  async function submit(event) {
    event.preventDefault()
    if (!state || stale || lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      if (resume) await resumeSubscription(id)
      else await freezeSubscription(id, Number(months))
      onRefresh(resume ? 'Đã kết thúc bảo lưu. Thời hạn gói đã được cập nhật.' : 'Đã bảo lưu gói tập.')
    } catch (err) {
      setError(memberPackageApiErrorMessage(err))
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
      {stale ? <p>Trạng thái gói đã thay đổi. Hãy cập nhật lại danh sách.</p> : state && <>
        {resume ? <p>Nếu tập lại ngay, số tháng bảo lưu đã dùng sẽ không được hoàn lại. Ngày hết hạn chỉ được cộng theo số ngày bảo lưu thực tế đủ 24 giờ.</p>
          : <><label>Số tháng bảo lưu (còn {state.remainingFreezeMonths} tháng)
            <input type="number" min="1" max={state.remainingFreezeMonths} step="1" required value={months} disabled={busy}
              onChange={event => setMonths(event.target.value)} /></label>
            <p>{state.freezeTerms}</p></>}
      </>}
      <div className="member-package-modal-actions">
        <button type="button" disabled={busy} onClick={onClose}>Đóng</button>
        {stale || (!state && error) ? <button type="button" onClick={() => onRefresh('')}>Cập nhật lại</button>
          : <button className="member-class-search-button" type="submit" disabled={!state || busy}>
            {busy ? 'Đang xử lý…' : resume ? 'Xác nhận tập lại' : 'Xác nhận bảo lưu'}
          </button>}
      </div>
    </form>
  </Modal>
}
