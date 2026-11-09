import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ReceptionistMemberContext from '../components/ReceptionistMemberContext'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'
import { getAuth } from '../auth/authStorage'
import { getReceptionistPackages, getReceptionistSubscriptions, registerReceptionistPackage } from '../services/receptionistRegistrationService'
import { getVnpayPaymentUrl, isValidPaymentId, paymentApiErrorMessage } from '../services/memberPaymentService'
import basicPackageImage from '../assets/member-package-basic.jpg'
import centerWorkoutImage from '../assets/center-manager-dashboard.jpg'
import premierPackageImage from '../assets/member-package-premier.jpg'
import standardPackageImage from '../assets/member-package-standard.jpg'
import DashboardLayout from '../components/DashboardLayout'
import ReceptionistLayout from '../components/ReceptionistLayout'
import Modal from '../components/Modal'
import PackageRenewalModal from '../components/PackageRenewalModal'
import PackageFreezeModal from '../components/PackageFreezeModal'
import PackageSportChoices from '../components/PackageSportChoices'
import SubscriptionSports from '../components/SubscriptionSports'
import { rememberSports } from '../utils/subscriptionSports'
import memberMenuItems from '../components/memberMenuItems'
import { GYM_COACHED, isGymVariant } from '../utils/gymPackages'
import {
  getGroupedMemberCatalog,
  getMemberPackageDetail,
  getMyMemberPackageSubscriptions,
  memberPackageApiErrorMessage,
  registerMemberPackage,
} from '../services/memberPackageService'
import './MemberActivities.css'
import './MemberPackages.css'

const priceFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const paymentMethods = [
  { value: 'Card', label: 'Thẻ VNPay' },
  { value: 'E_Wallet', label: 'QR chuyển khoản qua SePay' },
]

function packageImageFor(name, durationDays) {
  const packageName = String(name || '')
  if (/basic/i.test(packageName) || Number(durationDays) === 30) return basicPackageImage
  if (/standard/i.test(packageName) || Number(durationDays) === 90) return standardPackageImage
  if (/premier|premium/i.test(packageName) || [365, 730].includes(Number(durationDays))) return premierPackageImage
  return centerWorkoutImage
}

function subscriptionDurationLabel(durationDays) {
  if (durationDays === 365) return '12 tháng'
  if (durationDays === 730) return '24 tháng'
  if (durationDays > 0 && durationDays % 30 === 0) return `${durationDays / 30} tháng`
  return durationDays ? `${durationDays} ngày` : 'Gói hội viên'
}

function packageDurationLabel(packageItem) {
  return packageItem.durationMonths
    ? `${packageItem.durationMonths} tháng`
    : `${packageItem.durationDays} ngày`
}

function packageDetailDurationLabel(packageItem) {
  const days = Number(packageItem.durationDays)
  const months = Number(packageItem.durationMonths)
  if (Number.isFinite(days) && days > 0) {
    return Number.isFinite(months) && months > 0 ? `${months} tháng (${days} ngày)` : `${days} ngày`
  }
  return 'Chưa cập nhật'
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật'
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).slice(0, 10))
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function dateOrdinal(value) {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').slice(0, 10))
  return date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) / 86400000 : null
}

function subscriptionTimeline(subscription) {
  const purchaseDate = subscription.paymentDate?.slice(0, 10) || subscription.startDate
  const purchaseDay = dateOrdinal(purchaseDate)
  const expiryDay = dateOrdinal(subscription.endDate)
  const today = dateOrdinal(currentDate())
  const totalDays = purchaseDay != null && expiryDay != null ? Math.max(1, expiryDay - purchaseDay + 1) : 1
  const elapsedDays = purchaseDay != null && today != null ? today - purchaseDay : 0
  const progress = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)))
  const remainingDays = expiryDay != null && today != null ? Math.max(0, expiryDay - today + 1) : null

  return { purchaseDate, progress, remainingDays }
}

function currentDate() {
  const date = new Date()
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function isCurrentlyActive(subscription) {
  const today = currentDate()
  return subscription.subscriptionStatus?.toLowerCase() === 'active'
    && subscription.startDate <= today
    && subscription.endDate >= today
}

function subscriptionStatusLabel(status, paymentStatus) {
  if (String(status).toLowerCase() === 'pending' && String(paymentStatus).toLowerCase() === 'paid') return 'Sắp gia hạn'
  const labels = {
    active: 'Đang hoạt động',
    frozen: 'Đang bảo lưu',
    pending: 'Chờ xử lý',
    expired: 'Đã hết hạn',
    cancelled: 'Đã hủy',
  }
  return labels[String(status || '').toLowerCase()] || status || 'Chưa cập nhật'
}

function paymentMethodLabel(method) {
  if (method === 'Cash') return 'Tiền mặt'
  if (method === 'Bank_Transfer') return 'Chuyển khoản'
  return paymentMethods.find((option) => option.value === method)?.label || method || 'Chưa ghi nhận'
}

function EmptyState({ icon, title, children }) {
  return (
    <div className="member-empty-state">
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
      <h4>{title}</h4>
      <p>{children}</p>
    </div>
  )
}

export default function MemberPackages({ receptionist = false, memberId = null } = {}) {
  const PageLayout = receptionist ? ReceptionistLayout : DashboardLayout
  const navigate = useNavigate()
  const [authIdentity, setAuthIdentity] = useState(() => getAuth().userId || 'anonymous')
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [catalogResult, setCatalogResult] = useState(null)
  const [subscriptionsResult, setSubscriptionsResult] = useState(null)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [gymWithCoach, setGymWithCoach] = useState(false)
  const [renewalTarget, setRenewalTarget] = useState(null)
  const [freezeTarget, setFreezeTarget] = useState(null)
  const [choiceGroups, setChoiceGroups] = useState([])
  const [paymentMethod, setPaymentMethod] = useState(memberId ? 'Cash' : 'Card')
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [registrationError, setRegistrationError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const submitting = useRef(false)
  const packageDetailRequest = useRef(0)
  const detailsReady = Array.isArray(selectedPackage?.choiceGroups)
  const validChoices = detailsReady && selectedPackage.choiceGroups.every((group) =>
    choiceGroups.find((choice) => choice.choiceGroupId === group.id)?.sportIds.length === group.requiredSelection)

  const catalogSearch = memberId ? submittedSearch : ''
  const catalogPage = memberId ? page : 0
  const catalogRequestKey = JSON.stringify([authIdentity, memberId, catalogSearch, catalogPage, reloadKey])
  const subscriptionRequestKey = JSON.stringify([authIdentity, reloadKey])
  const catalog = catalogResult?.key === catalogRequestKey ? catalogResult : null
  const subscriptions = subscriptionsResult?.key === subscriptionRequestKey ? subscriptionsResult : null
  const matchingPackages = (catalog?.data || []).filter(item => memberId || !submittedSearch ||
    [item.name, item.description, item.variants?.coached.name, item.variants?.coached.description]
      .some(value => value?.toLocaleLowerCase().includes(submittedSearch.toLocaleLowerCase())))
  const packages = memberId ? matchingPackages : matchingPackages.slice(page * 20, (page + 1) * 20)
  const totalPackages = memberId ? catalog?.total || 0 : matchingPackages.length
  const catalogLoading = !catalog
  const selectedGym = selectedPackage && isGymVariant(selectedPackage.name)
    ? catalog?.data?.find(item => item.variants)?.variants : null
  const subscriptionsLoading = !subscriptions
  const catalogError = catalog?.error || ''
  const subscriptionsError = subscriptions?.error || ''

  useEffect(() => {
    function syncAuthIdentity(event) {
      if (event.key && !['accessToken', 'userId'].includes(event.key)) return
      setAuthIdentity(getAuth().userId || 'anonymous')
      packageDetailRequest.current += 1
      setSelectedPackage(null)
      setRenewalTarget(null)
      setRegistrationError('')
    }
    window.addEventListener('storage', syncAuthIdentity)
    return () => window.removeEventListener('storage', syncAuthIdentity)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const loadCatalog = memberId ? getReceptionistPackages : getGroupedMemberCatalog
    loadCatalog({
      search: catalogSearch,
      page: catalogPage,
      size: 20,
      signal: controller.signal,
    }).then((result) => {
      if (!controller.signal.aborted) {
        setCatalogResult({ key: catalogRequestKey, data: result.data, total: result.total })
      }
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setCatalogResult({ key: catalogRequestKey, error: memberPackageApiErrorMessage(error) })
      }
    })

    return () => controller.abort()
  }, [catalogRequestKey, catalogPage, catalogSearch, memberId])

  useEffect(() => {
    const controller = new AbortController()
    const loadSubscriptions = memberId ? (options) => getReceptionistSubscriptions(memberId, options) : getMyMemberPackageSubscriptions
    loadSubscriptions({ signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) {
        setSubscriptionsResult({ key: subscriptionRequestKey, data: result.data })
      }
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setSubscriptionsResult({ key: subscriptionRequestKey, error: memberPackageApiErrorMessage(error) })
      }
    })

    return () => controller.abort()
  }, [subscriptionRequestKey, memberId])

  const activeSubscription = subscriptions?.data?.find(isCurrentlyActive)
  const frozenSubscription = subscriptions?.data?.find(s => s.subscriptionStatus === 'Frozen')
  const singleActive = subscriptions?.data?.filter(isCurrentlyActive).length === 1
  const pendingSubscription = subscriptions?.data?.find((s) => s.subscriptionStatus === 'Pending' && s.paymentStatus === 'Pending')
  const scheduledSubscription = subscriptions?.data?.find((s) => s.subscriptionStatus === 'Pending' && s.paymentStatus === 'Paid')
  const memberCurrentSubscriptions = subscriptions?.data?.filter((subscription) =>
    isCurrentlyActive(subscription)
      || subscription.subscriptionStatus === 'Frozen'
      || (subscription.subscriptionStatus?.toLowerCase() === 'pending'
        && ['Pending', 'Paid'].includes(subscription.paymentStatus))) || []
  const displayedSubscriptions = memberId ? (subscriptions?.data || []) : memberCurrentSubscriptions
  const hasScheduledPackage = Boolean(subscriptions?.data?.some((s) =>
    s.subscriptionStatus === 'Pending' && s.startDate > currentDate()))

  function submitSearch(event) {
    event.preventDefault()
    setPage(0)
    setSuccessMessage('')
    setSubmittedSearch(search.trim())
    if (search.trim() === submittedSearch) setReloadKey((key) => key + 1)
  }

  function retryLoading() {
    setReloadKey((key) => key + 1)
  }

  async function openRegistration(packageItem) {
    if (activeSubscription) {
      setRenewalTarget({ packageId: packageItem.id })
      return
    }
    if (receptionist) {
      navigate(`/receptionist/members/${memberId}/checkout/packages/${packageItem.id}`)
      return
    }
    const requestId = ++packageDetailRequest.current
    setSelectedPackage({ ...packageItem, choiceGroups: null })
    setChoiceGroups([])
    setPaymentMethod(memberId ? 'Cash' : 'Card')
    setRegistrationError('')
    try {
      const details = await getMemberPackageDetail(packageItem.id)
      if (requestId !== packageDetailRequest.current) return
      setSelectedPackage(details)
      setChoiceGroups(details.choiceGroups.map((group) => ({ choiceGroupId: group.id, sportIds: [] })))
    } catch (error) {
      if (requestId === packageDetailRequest.current) setRegistrationError(memberPackageApiErrorMessage(error))
    }
  }

  function closeRegistration() {
    if (registrationLoading) return
    packageDetailRequest.current += 1
    setSelectedPackage(null)
    setRegistrationError('')
  }

  async function submitRegistration(event) {
    event.preventDefault()
    if (!selectedPackage || !validChoices || registrationLoading || submitting.current) return

    submitting.current = true
    setRegistrationLoading(true)
    setRegistrationError('')
    try {
      const register = memberId ? (body) => registerReceptionistPackage(memberId, body) : registerMemberPackage
      const result = await register({
        packageId: selectedPackage.id,
        paymentMethod,
        choiceGroups,
      })
      if (!memberId) {
        rememberSports(authIdentity, result.data.subscriptionId, selectedPackage, choiceGroups)
        if (paymentMethod === 'Card') window.location.assign(getVnpayPaymentUrl(result.data.paymentUrl))
        else navigate(`/member/payment-result?paymentId=${result.data.paymentId}&type=package`)
        return
      }
      if (memberId && paymentMethod !== 'Cash') {
        if (result.paymentStatus !== 'Pending' || !isValidPaymentId(String(result.paymentId))) {
          throw new Error('Chưa thể mở thanh toán. Hãy kiểm tra lịch sử trước khi thử lại.')
        }
        window.location.assign(paymentMethod === 'Card' ? getVnpayPaymentUrl(result.paymentUrl)
          : `/receptionist/members/${memberId}/payment-result?paymentId=${result.paymentId}`)
        return
      }
      setSuccessMessage(result.message || `Đăng ký gói "${selectedPackage.name}" thành công.`)
      setSelectedPackage(null)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setRegistrationError(memberId ? paymentApiErrorMessage(error) : memberPackageApiErrorMessage(error))
    } finally {
      submitting.current = false
      setRegistrationLoading(false)
    }
  }

  return (
    <PageLayout
      className={receptionist ? 'receptionist-packages-page' : undefined}
      eyebrow={receptionist ? 'Lễ tân / Đăng ký gói cho hội viên' : 'Hội viên / Gói tập'}
      menuItems={receptionist ? staffMenuItems[ROLES.RECEPTIONIST] : memberMenuItems}
      role={receptionist ? "Receptionist" : "Hội viên"}
      showIntro={false}
      title={receptionist ? 'Gói tập của hội viên' : 'Gói tập của tôi'}
    >
      {memberId && <>
        <Link className="receptionist-back-link receptionist-flow-back" to={`/receptionist/members/${memberId}`}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> Quay lại hồ sơ hội viên</Link>
        <ReceptionistMemberContext memberId={memberId} />
      </>}
      <section className="member-page-heading">
        <div>
          <span className="section-heading-kicker">QUYỀN LỢI HỘI VIÊN</span>
          <h2>Gói dịch vụ cá nhân</h2>
        </div>
        <span className="member-page-heading-icon material-symbols-outlined" aria-hidden="true">card_membership</span>
      </section>

      {successMessage && (
        <section className="member-registration-success" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
          <span>{successMessage} {memberId && <Link to={`/receptionist/members/${memberId}`}>Về thông tin hội viên</Link>}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setSuccessMessage('')}>×</button>
        </section>
      )}

      <section className="member-data-section member-package-section">
        <div className="member-data-section-heading">
          <div>
            <span className="section-heading-kicker">THẺ HỘI VIÊN</span>
            <h3>{receptionist ? 'Gói tập của hội viên' : 'Gói tập của tôi'}</h3>
          </div>
          <div className="member-package-heading-actions">
            {!subscriptionsError && !subscriptionsLoading && (
              <span className={`member-package-badge${activeSubscription ? ' is-active' : ''}`}>
                {activeSubscription
                  ? 'Đang có gói hoạt động'
                  : frozenSubscription ? 'Đang có gói bảo lưu' : displayedSubscriptions.length
                    ? `${displayedSubscriptions.length} gói đang chờ`
                    : 'Chưa có gói hoạt động'}
              </span>
            )}
            {!memberId && (
              <Link className="member-package-history-link" to="/member/packages/history">
                <span className="material-symbols-outlined" aria-hidden="true">history</span>
                Lịch sử đăng ký gói
              </Link>
            )}
          </div>
        </div>

        {(activeSubscription || scheduledSubscription) && (
          <section className="member-package-validity" aria-labelledby="member-package-validity-title">
            <div className="member-package-validity-heading">
              <h4 id="member-package-validity-title">Thời hạn gói tập</h4>
              {scheduledSubscription && (
                <a href={`#member-subscription-${scheduledSubscription.subscriptionId}`}>
                  Xem gói gia hạn
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_downward</span>
                </a>
              )}
            </div>
            {activeSubscription && (
              <div className="member-package-validity-row">
                <span className="member-package-validity-dot" aria-hidden="true" />
                <div className="member-package-validity-copy">
                  <strong>Gói hiện tại <span>· Đang hoạt động</span></strong>
                  <span>{activeSubscription.packageName}</span>
                </div>
                <div className="member-package-validity-date">
                  <span>Ngày hết hạn</span>
                  <time dateTime={activeSubscription.endDate}>{formatDate(activeSubscription.endDate)}</time>
                </div>
              </div>
            )}
            {scheduledSubscription && (
              <div className="member-package-validity-row">
                <span className="member-package-validity-icon material-symbols-outlined" aria-hidden="true">event_available</span>
                <div className="member-package-validity-copy">
                  <strong>Gói gia hạn <span>· Đã thanh toán</span></strong>
                  <span>{scheduledSubscription.packageName}</span>
                </div>
                <div className="member-package-validity-date">
                  <span>Ngày bắt đầu</span>
                  <time dateTime={scheduledSubscription.startDate}>{formatDate(scheduledSubscription.startDate)}</time>
                </div>
              </div>
            )}
          </section>
        )}

        {subscriptionsError && (
          <div className="member-package-state is-error" role="alert">
            <span>{subscriptionsError}</span>
            <button type="button" onClick={retryLoading}>Thử lại</button>
          </div>
        )}

        {!subscriptionsError && subscriptionsLoading && (
          <div className="member-package-state" role="status">Đang tải lịch sử gói tập...</div>
        )}

        {!subscriptionsError && !subscriptionsLoading && displayedSubscriptions.length === 0 && (
          <EmptyState icon="wallet" title={subscriptions.data.length ? 'Bạn chưa có gói đang sử dụng' : 'Bạn chưa đăng ký gói tập'}>
            {subscriptions.data.length
              ? <>Các gói đã đăng ký, kể cả gói đã hủy, được lưu trong <Link to="/member/packages/history">lịch sử đăng ký gói</Link>.</>
              : 'Sau khi đăng ký, thông tin gói đang sử dụng sẽ hiển thị tại đây.'}
          </EmptyState>
        )}

        {!subscriptionsError && !subscriptionsLoading && displayedSubscriptions.length > 0 && (
          <div className="member-subscription-list">
            {displayedSubscriptions.map((subscription) => {
              const durationLabel = subscriptionDurationLabel(subscription.durationDays)
              const image = packageImageFor(subscription.packageName, subscription.durationDays)
              const showTimeline = isCurrentlyActive(subscription)
              const timeline = showTimeline ? subscriptionTimeline(subscription) : null
              return (
                <article className={`member-subscription-card${showTimeline ? ' has-timeline' : ''}`} id={`member-subscription-${subscription.subscriptionId}`} key={subscription.subscriptionId}>
                  <div className="member-package-image member-subscription-image">
                    <img src={image} alt={`Hình minh họa gói ${subscription.packageName}`} loading="lazy" />
                    <span>{durationLabel}</span>
                  </div>
                  <div className="member-subscription-content">
                    <div className="member-subscription-heading">
                      <span className="member-package-code">MÃ ĐĂNG KÝ #{subscription.subscriptionId}</span>
                      <span className={`member-package-status status-${String(subscription.subscriptionStatus || '').toLowerCase()}`}>
                        {subscriptionStatusLabel(subscription.subscriptionStatus, subscription.paymentStatus)}
                      </span>
                    </div>
                    <h4>{subscription.packageName}</h4>
                    {!memberId && <SubscriptionSports memberId={authIdentity} subscription={subscription} />}
                    {!receptionist && !memberId && subscription.subscriptionStatus === 'Frozen' && (
                      <div className="member-freeze-controls">
                        <strong>Thời gian bảo lưu</strong>
                        <span>{formatDate(subscription.freezeStartedAt)} {subscription.freezeStartedAt?.slice(11, 16)} – {formatDate(subscription.freezeEndsAt)} {subscription.freezeEndsAt?.slice(11, 16)}</span>
                        <button className="member-class-search-button" type="button" onClick={() => setFreezeTarget(subscription.subscriptionId)}>Tập lại</button>
                      </div>
                    )}
                    {!receptionist && !memberId && showTimeline && singleActive && !pendingSubscription && subscription.durationDays >= 180 && subscription.remainingFreezeMonths > 0 && (
                      <div className="member-freeze-controls">
                        <span>Còn {subscription.remainingFreezeMonths} tháng bảo lưu</span>
                        <button className="member-class-search-button" type="button" onClick={() => setFreezeTarget(subscription.subscriptionId)}>Bảo lưu gói</button>
                      </div>
                    )}
                    <dl className="member-subscription-facts">
                      <div>
                        <dt>Thời hạn sử dụng</dt>
                        <dd>{formatDate(subscription.startDate)} – {formatDate(subscription.endDate)}</dd>
                      </div>
                      <div>
                        <dt>Giá gói</dt>
                        <dd>{priceFormatter.format(Number(subscription.packagePrice || 0))}</dd>
                      </div>
                      <div>
                        <dt>Thanh toán</dt>
                        <dd>{subscription.paymentStatus || 'Chưa ghi nhận'} · {paymentMethodLabel(subscription.paymentMethod)}</dd>
                      </div>
                    </dl>
                  </div>
                  {timeline && (
                    <aside className="member-subscription-timeline" aria-label="Thời hạn gói tập hiện tại">
                      <div className="member-subscription-timeline-heading">
                        <span className="material-symbols-outlined" aria-hidden="true">event_available</span>
                        <strong>Thời hạn gói</strong>
                      </div>
                      <div className="member-subscription-timeline-dates">
                        <span><small>Ngày mua</small><strong>{formatDate(timeline.purchaseDate)}</strong></span>
                        <span><small>Hết hạn</small><strong>{formatDate(subscription.endDate)}</strong></span>
                      </div>
                      <div className="member-subscription-progress" role="progressbar"
                        aria-label="Thời hạn đã sử dụng" aria-valuemin="0" aria-valuemax="100" aria-valuenow={timeline.progress}>
                        <span style={{ width: `${timeline.progress}%` }} />
                      </div>
                      <div className="member-subscription-timeline-footer">
                        <span>{timeline.progress}% thời hạn đã sử dụng</span>
                        {timeline.remainingDays != null && <strong>Còn {timeline.remainingDays} ngày</strong>}
                      </div>
                      <button className="member-class-search-button" type="button" disabled={Boolean(pendingSubscription)}
                        onClick={() => setRenewalTarget({})}>Gia hạn gói</button>
                    </aside>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="member-data-section member-package-section">
        <div className="member-data-section-heading">
          <div>
            <span className="section-heading-kicker">LỰA CHỌN CỦA BẠN</span>
            <h3>Gói dịch vụ đang mở bán</h3>
          </div>
          <span className="member-package-total">{totalPackages} gói</span>
        </div>

        <form className="member-class-search member-package-search" aria-label="Tìm kiếm gói tập" onSubmit={submitSearch}>
          <label className="member-class-search-input">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              aria-label="Tìm gói tập"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên hoặc mô tả gói"
              value={search}
            />
          </label>
          <button className="member-class-search-button" disabled={catalogLoading} type="submit">
            Tìm kiếm
          </button>
        </form>

        {pendingSubscription && <p className="member-package-note" role="status">
          Hội viên có giao dịch gói đang chờ thanh toán. <Link to={memberId
            ? `/receptionist/members/${memberId}/payment-result?paymentId=${pendingSubscription.paymentId}`
            : `/member/payment-result?paymentId=${pendingSubscription.paymentId}`}>Kiểm tra thanh toán</Link>.
        </p>}
        {catalogError && (
          <div className="member-package-state is-error" role="alert">
            <span>{catalogError}</span>
            <button type="button" onClick={retryLoading}>Thử lại</button>
          </div>
        )}

        {!catalogError && catalogLoading && (
          <div className="member-package-state" role="status">Đang tải danh sách gói từ backend...</div>
        )}

        {!catalogError && !catalogLoading && packages.length === 0 && (
          <EmptyState icon="inventory_2" title={submittedSearch ? 'Không tìm thấy gói phù hợp' : 'Chưa có gói đang mở bán'}>
            {submittedSearch
              ? 'Thử tìm với từ khóa khác.'
              : 'Các gói tập sẽ xuất hiện tại đây khi được mở bán.'}
          </EmptyState>
        )}

        {!catalogError && !catalogLoading && packages.length > 0 && (
          <div className="member-package-grid" aria-label="Danh sách gói đang mở bán">
            {packages.map((entry) => {
              const packageItem = entry.variants ? (gymWithCoach ? entry.variants.coached : entry.variants.solo) : entry
              const isStandardThreeMonthPackage = /standard/i.test(packageItem.name || '')
                && (Number(packageItem.durationMonths) === 3 || /3\s*tháng/i.test(packageItem.name || ''))
              const isPremierTwelveMonthPackage = /premier|premium/i.test(packageItem.name || '')
                && (Number(packageItem.durationMonths) === 12 || /12\s*tháng/i.test(packageItem.name || ''))
              const isBasicOneMonthPackage = /basic/i.test(packageItem.name || '')
                && (Number(packageItem.durationMonths) === 1 || /1\s*tháng/i.test(packageItem.name || ''))
              const image = isBasicOneMonthPackage
                ? basicPackageImage
                : isPremierTwelveMonthPackage
                  ? premierPackageImage
                  : isStandardThreeMonthPackage
                    ? standardPackageImage
                    : centerWorkoutImage
              const durationLabel = packageDurationLabel(packageItem)
              return (
                <article className="member-package-card" key={entry.id}>
                  <div className="member-package-card-topline">
                    <span className="member-package-duration">{durationLabel}</span>
                    <span className="material-symbols-outlined" aria-hidden="true">workspace_premium</span>
                  </div>
                  <div className="member-package-image">
                    <img src={image} alt={`Hình minh họa gói ${packageItem.name}`} loading="lazy" />
                  </div>
                  <div className="member-package-card-content">
                    <span className="member-package-code">{packageItem.code || `GÓI #${packageItem.id}`}</span>
                    <h4>{entry.name}</h4>
                    {entry.variants && <label><input type="checkbox" checked={gymWithCoach}
                      onChange={event => setGymWithCoach(event.target.checked)} /> Có huấn luyện viên 1–1</label>}
                    {packageItem.description && <p className="member-package-description">{packageItem.description}</p>}
                    <dl className="member-package-facts">
                      <div>
                        <dt><span className="material-symbols-outlined" aria-hidden="true">schedule</span>Thời hạn</dt>
                        <dd>{durationLabel}</dd>
                      </div>
                      {!entry.variants && <div>
                        <dt><span className="material-symbols-outlined" aria-hidden="true">fitness_center</span>Số buổi</dt>
                        <dd>Không giới hạn trong thời hạn gói</dd>
                      </div>}
                    </dl>
                    {packageItem.benefits && (
                      <p className="member-package-benefits">
                        <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                        <span><strong>Quyền lợi:</strong> {normalizePackageBenefits(packageItem.benefits)}</span>
                      </p>
                    )}
                    {packageItem.termConditions && <p className="member-package-terms">{packageItem.termConditions}</p>}
                  </div>
                  <div className="member-package-card-footer">
                    <div>
                      <span>Học phí niêm yết</span>
                      <strong>{priceFormatter.format(Number(packageItem.price || 0))}</strong>
                    </div>
                    <button
                      className="member-class-search-button"
                      disabled={Boolean(subscriptionsLoading || subscriptionsError || pendingSubscription)}
                      onClick={() => openRegistration(packageItem)}
                      type="button"
                    >
                      {activeSubscription ? 'Chọn để gia hạn' : 'Chọn gói'}
                      <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {!catalogError && !catalogLoading && totalPackages > 20 && (
          <div className="member-package-pagination">
            <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Trang trước</button>
            <span>Trang {page + 1} / {Math.ceil(totalPackages / 20)}</span>
            <button
              type="button"
              disabled={(page + 1) * 20 >= totalPackages}
              onClick={() => setPage((value) => value + 1)}
            >
              Trang sau
            </button>
          </div>
        )}
      </section>

      {renewalTarget && <PackageRenewalModal memberId={memberId}
        requestedPackageId={memberId ? undefined : renewalTarget.packageId}
        hasScheduledPackage={hasScheduledPackage} onClose={() => setRenewalTarget(null)}
        onSuccess={() => {
          setSuccessMessage('Gia hạn gói tập thành công.')
          setRenewalTarget(null)
          setReloadKey((key) => key + 1)
        }} />}

      {freezeTarget != null && !receptionist && displayedSubscriptions.some(s => s.subscriptionId === freezeTarget) && (
        <PackageFreezeModal key={freezeTarget} subscription={displayedSubscriptions.find(s => s.subscriptionId === freezeTarget)}
          onClose={() => setFreezeTarget(null)} onRefresh={message => {
            setFreezeTarget(null)
            setSuccessMessage(message)
            retryLoading()
          }} />
      )}
      {selectedPackage && (
        <Modal
          busy={registrationLoading}
          className="member-package-modal member-package-registration-modal"
          onClose={closeRegistration}
          title="Xác nhận đăng ký gói"
        >
          <form onSubmit={submitRegistration}>
            {memberId && <ReceptionistMemberContext memberId={memberId} />}
            <p className="member-package-modal-name">{selectedPackage.name}</p>
            {selectedGym && <label><input type="checkbox" disabled={registrationLoading}
              checked={selectedPackage.name === GYM_COACHED} onChange={event => {
                const checked = event.target.checked
                setGymWithCoach(checked)
                void openRegistration(checked ? selectedGym.coached : selectedGym.solo)
              }} /> Có huấn luyện viên 1–1</label>}
            {!detailsReady && !registrationError && <p role="status">Đang tải chi tiết gói tập…</p>}
            {detailsReady && <>
              {selectedPackage.description && <p className="member-package-registration-description">{selectedPackage.description}</p>}
              <dl className="member-package-registration-facts">
                <div>
                  <dt>Thời hạn sử dụng</dt>
                  <dd>{packageDetailDurationLabel(selectedPackage)}</dd>
                </div>
                {!selectedGym && <div>
                  <dt>Số buổi tập</dt>
                  <dd>Không giới hạn trong thời hạn gói</dd>
                </div>}
                <div>
                  <dt>Giá niêm yết</dt>
                  <dd className="member-package-registration-price">{selectedPackage.price != null && Number.isFinite(Number(selectedPackage.price))
                    ? priceFormatter.format(Number(selectedPackage.price)) : 'Chưa cập nhật'}</dd>
                </div>
                {Number(selectedPackage.discount) > 0 && <div>
                  <dt>Ưu đãi của gói</dt>
                  <dd>{selectedPackage.discount}%</dd>
                </div>}
              </dl>
              <section className="member-package-registration-section" aria-label="Quyền lợi của gói">
                <h4>Quyền lợi</h4>
                <p>{normalizePackageBenefits(selectedPackage.benefits)?.trim() || 'Chưa có thông tin quyền lợi.'}</p>
              </section>
              <section className="member-package-registration-section" aria-label="Điều kiện sử dụng gói">
                <h4>Điều kiện sử dụng</h4>
                <p>{selectedPackage.termConditions?.trim() || 'Chưa có thông tin điều kiện sử dụng.'}</p>
              </section>
              <section className="member-package-choice-section" aria-label="Môn học đi kèm">
                <h4>Môn học đi kèm</h4>
                {Array.isArray(selectedPackage.includedSports) && selectedPackage.includedSports.length > 0
                  ? <div className="member-package-sport-tags">{selectedPackage.includedSports.map((sport) => <span key={sport.id}>{sport.name}</span>)}</div>
                  : <p>Chưa có thông tin môn học đi kèm.</p>}
              </section>
              <section className="member-package-registration-section" aria-label="Môn học tự chọn">
                <h4>Môn học tự chọn</h4>
                {selectedPackage.choiceGroups.length > 0
                  ? <PackageSportChoices groups={selectedPackage.choiceGroups} choices={choiceGroups}
                    onChange={setChoiceGroups} disabled={registrationLoading} />
                  : <p>Gói này không có nhóm môn tự chọn.</p>}
              </section>
            </>}
            <label className="member-package-payment-field">
              Hình thức thanh toán
              <select
                disabled={registrationLoading || !detailsReady}
                onChange={(event) => setPaymentMethod(event.target.value)}
                value={paymentMethod}
              >
                {(memberId ? [{ value: "Cash", label: "Thanh toán tại quầy — Tiền mặt" }, { value: "Card", label: "Thẻ ATM qua VNPay" }, { value: "E_Wallet", label: "QR chuyển khoản qua SePay" }] : paymentMethods).map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </label>
            <p className="member-package-payment-warning" role="note">
              {memberId ? paymentMethod === 'Cash'
                ? 'Chỉ xác nhận sau khi lễ tân đã nhận đủ tiền. Tổng tiền sẽ được kiểm tra lại trên máy chủ.'
                : 'Gói chỉ được kích hoạt khi cổng thanh toán xác nhận giao dịch thành công.'
                : 'Bạn sẽ được chuyển đến VNPay hoặc màn hình mã QR. Gói chỉ được kích hoạt sau khi thanh toán thành công.'}
            </p>
            {registrationError && <p className="member-package-form-error" role="alert">{registrationError}</p>}
            <div className="member-package-modal-actions">
              <button className="member-package-cancel" disabled={registrationLoading} onClick={closeRegistration} type="button">
                Hủy
              </button>
              <button className="member-class-search-button" disabled={registrationLoading || !validChoices} type="submit">
                {registrationLoading ? 'Đang xử lý...' : memberId && paymentMethod === 'Cash' ? 'Xác nhận đã nhận tiền' : 'Tiếp tục thanh toán'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageLayout>
  )
}
import { normalizePackageBenefits } from '../utils/packageBenefits'
