import { useCallback, useRef, useState } from 'react'
import Modal from './Modal'
import useMemberRequest from '../hooks/useMemberRequest'
import { memberPackageApiErrorMessage } from '../services/memberPackageService'
import { getPackageRenewalOverview, previewPackageRenewal, renewPackage } from '../services/packageRenewalService'
import { getReceptionistSubscriptions } from '../services/receptionistRegistrationService'
import { getVnpayPaymentUrl } from '../services/memberPaymentService'
import { useNavigate } from 'react-router-dom'
import PackageSportChoices from './PackageSportChoices'

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const emptyGroups = []

function dateLabel(value) {
  return value ? String(value).slice(0, 10).split('-').reverse().join('/') : 'Chưa cập nhật'
}

export default function PackageRenewalModal({ memberId, initialPackageId, expectedSubscriptionId, hasScheduledPackage, onClose, onSuccess }) {
  const [busy, setBusy] = useState(false)
  const request = useCallback(async (signal) => {
    const overview = await getPackageRenewalOverview(memberId, signal)
    if (memberId && hasScheduledPackage === undefined) {
      const history = await getReceptionistSubscriptions(memberId, { signal })
      if (!Array.isArray(history.data)) throw new Error('Lịch sử gói từ máy chủ không hợp lệ.')
      return { ...overview, hasScheduledPackage: history.data.some((s) => s.subscriptionStatus === 'Pending' && s.paymentStatus === 'Paid'),
        pendingPayment: history.data.some((s) => s.paymentStatus === 'Pending') }
    }
    return { ...overview, hasScheduledPackage }
  }, [memberId, hasScheduledPackage])
  const { data, error, loading, retry } = useMemberRequest(request)
  const matchesSubscription = !expectedSubscriptionId || data?.currentSubscription?.subscriptionId === expectedSubscriptionId

  return <Modal title="Gia hạn gói tập" className="member-package-modal member-renewal-modal" busy={busy} onClose={onClose}>
    {memberId && <p className="member-package-note">Gia hạn cho hội viên <strong>#{memberId}</strong>.</p>}
    {loading && <p role="status">Đang tải thông tin gia hạn…</p>}
    {error && <div className="member-package-state is-error" role="alert">
      <span>{memberPackageApiErrorMessage(error)}</span><button type="button" onClick={retry}>Thử lại</button>
    </div>}
    {data && !data.currentSubscription && <p role="alert">Hội viên chưa có gói đang hoạt động để gia hạn. Hãy đóng cửa sổ và tải lại danh sách gói.</p>}
    {data?.currentSubscription && !matchesSubscription && <p role="alert">Gói được chọn không còn là gói đang hoạt động. Hãy đóng cửa sổ và tải lại hồ sơ hội viên.</p>}
    {data?.pendingPayment && <p role="alert">Hội viên đang có giao dịch gói chờ thanh toán. Hãy xử lý giao dịch đó trước khi gia hạn.</p>}
    {data?.currentSubscription && matchesSubscription && !data.pendingPayment && <RenewalForm overview={data} memberId={memberId} initialPackageId={initialPackageId}
      hasScheduledPackage={data.hasScheduledPackage} busy={busy} setBusy={setBusy} onClose={onClose} onSuccess={onSuccess} />}
  </Modal>
}

function RenewalForm({ overview, memberId, initialPackageId, hasScheduledPackage, busy, setBusy, onClose, onSuccess }) {
  const navigate = useNavigate()
  const [packageId, setPackageId] = useState(String(initialPackageId || ''))
  const [renewalStart, setRenewalStart] = useState(hasScheduledPackage ? '' : 'AFTER_CURRENT')
  const [choiceGroups, setChoiceGroups] = useState(() => (overview.availablePackages
    .find((item) => item.id === initialPackageId)?.choiceGroups || []).map((group) => ({ choiceGroupId: group.id, sportIds: [] })))
  const [paymentMethod, setPaymentMethod] = useState(memberId ? 'Cash' : 'Card')
  const [receivedCash, setReceivedCash] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const inFlight = useRef(false)
  const selectedPackage = overview.availablePackages.find((item) => String(item.id) === packageId)
  const groups = selectedPackage?.choiceGroups || emptyGroups
  const validSelection = Boolean(selectedPackage && renewalStart) && groups.every((group) =>
    choiceGroups.find((choice) => choice.choiceGroupId === group.id)?.sportIds.length === group.requiredSelection)
  const request = useCallback((signal) => previewPackageRenewal(memberId, {
    packageId: Number(packageId), renewalStart, choiceGroups,
  }, signal), [memberId, packageId, renewalStart, choiceGroups])
  const preview = useMemberRequest(request, validSelection, 250)
  const canConfirm = Boolean(preview.data) && (!memberId || receivedCash)

  function resetConfirmation() {
    setReceivedCash(false)
    setSubmitError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (!canConfirm || busy || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setSubmitError('')
    try {
      const result = await renewPackage(memberId, { packageId: Number(packageId), renewalStart, choiceGroups, paymentMethod })
      if (!memberId) {
        if (paymentMethod === 'Card') window.location.assign(getVnpayPaymentUrl(result.data.paymentUrl))
        else navigate(`/member/payment-result?paymentId=${result.data.paymentId}&type=package`)
        return
      }
      onSuccess(result)
    } catch (error) {
      setSubmitError(memberPackageApiErrorMessage(error))
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <form className="member-renewal-form" onSubmit={submit}>
    <p className="member-package-note">Gói hiện tại: <strong>{overview.currentSubscription.packageName}</strong><br />
      Hết hạn ngày {dateLabel(overview.currentSubscription.endDate)}.</p>
    {overview.availablePackages.length === 0 && <p role="status">Chưa có gói phù hợp để gia hạn.</p>}
    <label className="member-package-payment-field">Gói gia hạn
      <select value={selectedPackage ? packageId : ''} disabled={busy} required onChange={(event) => {
        setPackageId(event.target.value)
        setChoiceGroups((overview.availablePackages.find((item) => String(item.id) === event.target.value)?.choiceGroups || [])
          .map((group) => ({ choiceGroupId: group.id, sportIds: [] })))
        resetConfirmation()
      }}>
        <option value="">Chọn gói tập</option>
        {overview.availablePackages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    <label className="member-package-payment-field">Thời điểm bắt đầu
      <select value={renewalStart} disabled={busy} onChange={(event) => { setRenewalStart(event.target.value); resetConfirmation() }}>
        <option value="" disabled>Chọn thời điểm bắt đầu</option>
        <option value="AFTER_CURRENT" disabled={hasScheduledPackage}>Sau khi gói hiện tại hết hạn</option>
        <option value="IMMEDIATE">Bắt đầu ngay</option>
      </select>
    </label>
    {hasScheduledPackage && <p className="member-package-payment-warning">Đã có gói chờ bắt đầu. Không thể xếp thêm gói sau gói hiện tại.</p>}
    {renewalStart === 'IMMEDIATE' && <p className="member-package-payment-warning" role="note">
      Gói hiện tại sẽ kết thúc ngay khi xác nhận gia hạn. Thời hạn còn lại không được cộng vào gói mới.
    </p>}
    {selectedPackage?.includedSports?.length > 0 && <p className="member-package-note">
      Môn có sẵn: {selectedPackage.includedSports.map((sport) => sport.name).join(', ')}.
    </p>}
    <PackageSportChoices groups={groups} choices={choiceGroups} disabled={busy}
      onChange={(update) => { setChoiceGroups(update); resetConfirmation() }} />
    {preview.loading && <p role="status">Đang tính thời hạn và học phí gia hạn…</p>}
    {preview.error && <div className="member-package-state is-error" role="alert">
      <span>{memberPackageApiErrorMessage(preview.error)}</span><button type="button" onClick={preview.retry}>Thử lại</button>
    </div>}
    {preview.data && <dl className="member-subscription-facts member-renewal-preview" aria-label="Thông tin gia hạn">
      <div><dt>Hiệu lực gói mới</dt><dd>{dateLabel(preview.data.newStartDate)} – {dateLabel(preview.data.newEndDate)}</dd></div>
      <div><dt>Giá niêm yết</dt><dd>{money.format(preview.data.listedPrice)}</dd></div>
      <div><dt>Giảm giá</dt><dd>{money.format(preview.data.discountAmount)}</dd></div>
      <div><dt>Tổng thanh toán</dt><dd>{money.format(preview.data.totalAmount)}</dd></div>
    </dl>}
    <label className="member-package-payment-field">Hình thức thanh toán
      <select value={paymentMethod} disabled={busy} onChange={(event) => { setPaymentMethod(event.target.value); resetConfirmation() }}>
        {memberId ? <option value="Cash">Tiền mặt</option>
          : <><option value="Card">Thẻ VNPay</option><option value="E_Wallet">QR chuyển khoản qua SePay</option></>}
      </select>
    </label>
    {memberId ? <label className="member-renewal-confirm"><input type="checkbox" checked={receivedCash} disabled={busy || !preview.data}
      onChange={(event) => setReceivedCash(event.target.checked)} />Tôi xác nhận đã nhận đủ tiền mặt theo tổng thanh toán ở trên.</label>
      : <p className="member-package-payment-warning">Gói chỉ được gia hạn sau khi thanh toán thành công. Bạn sẽ được chuyển đến VNPay hoặc màn hình mã QR để thanh toán.</p>}
    {submitError && <p className="member-package-form-error" role="alert">{submitError}</p>}
    <div className="member-package-modal-actions">
      <button className="member-package-cancel" type="button" disabled={busy} onClick={onClose}>Đóng</button>
      <button className="member-class-search-button" type="submit" disabled={busy || !canConfirm}>
        {busy ? 'Đang gia hạn…' : 'Xác nhận gia hạn'}
      </button>
    </div>
  </form>
}
