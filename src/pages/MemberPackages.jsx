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
import Modal from '../components/Modal'
import memberMenuItems from '../components/memberMenuItems'
import {
  getMemberPackageCatalog,
  getMemberPackage,
  getMyMemberPackageSubscriptions,
  previewMemberPackageRenewal,
  renewMemberPackage,
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
  { value: 'Cash', label: 'Tiền mặt' },
  { value: 'Card', label: 'Thẻ' },
  { value: 'Bank_Transfer', label: 'Chuyển khoản' },
  { value: 'E_Wallet', label: 'Ví điện tử' },
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

function subscriptionStatusLabel(status) {
  const labels = {
    active: 'Đang hoạt động',
    pending: 'Chờ xử lý',
    expired: 'Đã hết hạn',
    cancelled: 'Đã hủy',
  }
  return labels[String(status || '').toLowerCase()] || status || 'Chưa cập nhật'
}

function paymentMethodLabel(method) {
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
  const navigate = useNavigate()
  const [authIdentity, setAuthIdentity] = useState(() => getAuth().userId || 'anonymous')
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [catalogResult, setCatalogResult] = useState(null)
  const [subscriptionsResult, setSubscriptionsResult] = useState(null)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [registrationError, setRegistrationError] = useState('')
  const [packageDetailLoading, setPackageDetailLoading] = useState(false)
  const [choiceSelection, setChoiceSelection] = useState({})
  const [renewalStart, setRenewalStart] = useState('IMMEDIATE')
  const [renewalPreview, setRenewalPreview] = useState(null)
  const [renewalPreviewLoading, setRenewalPreviewLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const submitting = useRef(false)

  const catalogRequestKey = JSON.stringify([authIdentity, submittedSearch, page, reloadKey])
  const subscriptionRequestKey = JSON.stringify([authIdentity, reloadKey])
  const catalog = catalogResult?.key === catalogRequestKey ? catalogResult : null
  const subscriptions = subscriptionsResult?.key === subscriptionRequestKey ? subscriptionsResult : null
  const packages = catalog?.data || []
  const totalPackages = catalog?.total || 0
  const catalogLoading = !catalog
  const subscriptionsLoading = !subscriptions
  const catalogError = catalog?.error || ''
  const subscriptionsError = subscriptions?.error || ''

  useEffect(() => {
    function syncAuthIdentity(event) {
      if (event.key && !['accessToken', 'userId'].includes(event.key)) return
      const nextIdentity = getAuth().userId || 'anonymous'
      setAuthIdentity((current) => current === nextIdentity ? current : nextIdentity)
      setSelectedPackage(null)
      setRegistrationError('')
      setRenewalPreview(null)
    }
    window.addEventListener('storage', syncAuthIdentity)
    return () => window.removeEventListener('storage', syncAuthIdentity)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const loadCatalog = memberId ? getReceptionistPackages : getMemberPackageCatalog
    loadCatalog({
      search: submittedSearch,
      page,
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
  }, [authIdentity, catalogRequestKey, page, reloadKey, submittedSearch, memberId])

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
  }, [authIdentity, memberId, reloadKey, subscriptionRequestKey])

  const activeSubscription = subscriptions?.data?.find(isCurrentlyActive)
  const pendingSubscription = subscriptions?.data?.find((s) => s.subscriptionStatus === 'Pending')
  const visiblePackages = activeSubscription
    ? packages.filter((packageItem) => Number(packageItem.id) !== Number(activeSubscription.packageId))
    : packages
  const visiblePackageCount = Math.max(0, totalPackages - (packages.length - visiblePackages.length))

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

  function openRegistration(packageItem) {
    if (receptionist) {
      navigate(`/receptionist/members/${memberId}/checkout/packages/${packageItem.id}`)
      return
    }
    const isRenewal = Boolean(activeSubscription)
    setSelectedPackage({ ...packageItem, isRenewal })
    setPaymentMethod('Cash')
    setRegistrationError('')
    setChoiceSelection({})
    setRenewalStart('IMMEDIATE')
    setRenewalPreview(null)
    setPackageDetailLoading(true)
    getMemberPackage(packageItem.id).then((detail) => {
      setSelectedPackage({ ...detail, isRenewal })
    }).catch((error) => {
      setRegistrationError(memberPackageApiErrorMessage(error))
    }).finally(() => setPackageDetailLoading(false))
  }

  function closeRegistration() {
    if (registrationLoading) return
    setSelectedPackage(null)
    setRegistrationError('')
    setRenewalPreview(null)
  }

  async function submitRegistration(event) {
    event.preventDefault()
    if (!selectedPackage || packageDetailLoading || registrationLoading || renewalPreviewLoading || submitting.current) return

    const choiceGroups = (selectedPackage.choiceGroups || []).map((group) => ({
      choiceGroupId: group.id,
      sportIds: choiceSelection[group.id] || [],
    }))
    const incompleteGroup = (selectedPackage.choiceGroups || []).find((group) =>
      (choiceSelection[group.id] || []).length !== group.requiredSelection)
    if (incompleteGroup) {
      setRegistrationError(`Vui lòng chọn chính xác ${incompleteGroup.requiredSelection} môn cho nhóm “${incompleteGroup.name}”.`)
      return
    }

    if (selectedPackage.isRenewal && !renewalPreview) {
      setRenewalPreviewLoading(true)
      setRegistrationError('')
      try {
        const preview = await previewMemberPackageRenewal({
          packageId: selectedPackage.id,
          renewalStart,
          choiceGroups,
        })
        setRenewalPreview(preview)
      } catch (error) {
        setRegistrationError(memberPackageApiErrorMessage(error))
      } finally {
        setRenewalPreviewLoading(false)
      }
      return
    }

    submitting.current = true
    setRegistrationLoading(true)
    setRegistrationError('')
    try {
      const payload = {
        packageId: selectedPackage.id,
        paymentMethod,
        choiceGroups,
        renewalStart,
      }
      const register = memberId
        ? (body) => registerReceptionistPackage(memberId, body)
        : selectedPackage.isRenewal ? renewMemberPackage : registerMemberPackage
      const result = await register(payload)
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

  function toggleChoiceSport(group, sportId) {
    setRegistrationError('')
    setRenewalPreview(null)
    setChoiceSelection((current) => {
      const selected = current[group.id] || []
      const next = selected.includes(sportId)
        ? selected.filter((id) => id !== sportId)
        : selected.length < group.requiredSelection ? [...selected, sportId] : selected
      return { ...current, [group.id]: next }
    })
  }

  return (
    <DashboardLayout
      eyebrow={receptionist ? 'Lễ tân / Đăng ký gói cho hội viên' : 'Hội viên / Gói tập'}
      menuItems={receptionist ? staffMenuItems[ROLES.RECEPTIONIST] : memberMenuItems}
      role={receptionist ? "Receptionist" : "Hội viên"}
      showIntro={false}
      title={receptionist ? 'Gói tập của hội viên' : 'Gói tập của tôi'}
    >
      {memberId && <ReceptionistMemberContext memberId={memberId} />}
      <section className="member-page-heading">
        <div>
          <span className="section-heading-kicker">QUYỀN LỢI HỘI VIÊN</span>
          <h2>Gói dịch vụ cá nhân</h2>
          <p>Xem gói đang sử dụng, theo dõi lịch sử và đăng ký gói tập phù hợp.</p>
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
          {!subscriptionsError && !subscriptionsLoading && (
            <span className={`member-package-badge${activeSubscription ? ' is-active' : ''}`}>
              {activeSubscription ? 'Đang có gói hoạt động' : `${subscriptions.data.length} gói trong lịch sử`}
            </span>
          )}
        </div>

        {subscriptionsError && (
          <div className="member-package-state is-error" role="alert">
            <span>{subscriptionsError}</span>
            <button type="button" onClick={retryLoading}>Thử lại</button>
          </div>
        )}

        {!subscriptionsError && subscriptionsLoading && (
          <div className="member-package-state" role="status">Đang tải lịch sử gói tập...</div>
        )}

        {!subscriptionsError && !subscriptionsLoading && subscriptions.data.length === 0 && (
          <EmptyState icon="wallet" title="Bạn chưa đăng ký gói tập">
            Sau khi đăng ký, thông tin gói và thời hạn sử dụng sẽ hiển thị tại đây.
          </EmptyState>
        )}

        {!subscriptionsError && !subscriptionsLoading && subscriptions.data.length > 0 && (
          <div className="member-subscription-list">
            {subscriptions.data.map((subscription) => {
              const durationLabel = subscriptionDurationLabel(subscription.durationDays)
              const image = packageImageFor(subscription.packageName, subscription.durationDays)
              const showTimeline = isCurrentlyActive(subscription)
              const timeline = showTimeline ? subscriptionTimeline(subscription) : null
              return (
                <article className={`member-subscription-card${showTimeline ? ' has-timeline' : ''}`} key={subscription.subscriptionId}>
                  <div className="member-package-image member-subscription-image">
                    <img src={image} alt={`Hình minh họa gói ${subscription.packageName}`} loading="lazy" />
                    <span>{durationLabel}</span>
                  </div>
                  <div className="member-subscription-content">
                    <div className="member-subscription-heading">
                      <span className="member-package-code">MÃ ĐĂNG KÝ #{subscription.subscriptionId}</span>
                      <span className={`member-package-status status-${String(subscription.subscriptionStatus || '').toLowerCase()}`}>
                        {subscriptionStatusLabel(subscription.subscriptionStatus)}
                      </span>
                    </div>
                    <h4>{subscription.packageName}</h4>
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
          <span className="member-package-total">{visiblePackageCount} gói</span>
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
          {memberId && pendingSubscription.paymentStatus === 'Pending'
            ? <>Hội viên có giao dịch gói đang chờ thanh toán. <Link to={`/receptionist/members/${memberId}/payment-result?paymentId=${pendingSubscription.paymentId}`}>Kiểm tra hoặc hủy yêu cầu thanh toán</Link>.</>
            : <>Gói gia hạn đã được ghi nhận và đang chờ ngày bắt đầu {formatDate(pendingSubscription.startDate)}.</>}
        </p>}
        {activeSubscription && (
          <p className="member-package-note" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
            <span>
              <strong>Bạn đang có gói hoạt động đến {formatDate(activeSubscription.endDate)}.</strong>
              {' '}Bạn có thể chọn gói mới để gia hạn và bắt đầu ngay hoặc sau khi gói hiện tại kết thúc.
            </span>
          </p>
        )}

        {catalogError && (
          <div className="member-package-state is-error" role="alert">
            <span>{catalogError}</span>
            <button type="button" onClick={retryLoading}>Thử lại</button>
          </div>
        )}

        {!catalogError && catalogLoading && (
          <div className="member-package-state" role="status">Đang tải danh sách gói từ backend...</div>
        )}

        {!catalogError && !catalogLoading && visiblePackages.length === 0 && (
          <EmptyState icon="inventory_2" title={submittedSearch ? 'Không tìm thấy gói phù hợp' : 'Chưa có gói đang mở bán'}>
            {submittedSearch
              ? 'Thử tìm với từ khóa khác.'
              : 'Các gói tập sẽ xuất hiện tại đây khi được mở bán.'}
          </EmptyState>
        )}

        {!catalogError && !catalogLoading && visiblePackages.length > 0 && (
          <div className="member-package-grid" aria-label="Danh sách gói đang mở bán">
            {visiblePackages.map((packageItem) => {
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
                <article className="member-package-card" key={packageItem.id}>
                  <div className="member-package-card-topline">
                    <span className="member-package-duration">{durationLabel}</span>
                    <span className="material-symbols-outlined" aria-hidden="true">workspace_premium</span>
                  </div>
                  <div className="member-package-image">
                    <img src={image} alt={`Hình minh họa gói ${packageItem.name}`} loading="lazy" />
                    <span>{`${packageItem.includedClasses ?? 'Chưa cập nhật'} buổi tập`}</span>
                  </div>
                  <div className="member-package-card-content">
                    <span className="member-package-code">{packageItem.code || `GÓI #${packageItem.id}`}</span>
                    <h4>{packageItem.name}</h4>
                    {packageItem.description && <p className="member-package-description">{packageItem.description}</p>}
                    <dl className="member-package-facts">
                      <div>
                        <dt><span className="material-symbols-outlined" aria-hidden="true">schedule</span>Thời hạn</dt>
                        <dd>{durationLabel}</dd>
                      </div>
                      <div>
                        <dt><span className="material-symbols-outlined" aria-hidden="true">fitness_center</span>Số buổi</dt>
                        <dd>{`${packageItem.includedClasses ?? 'Chưa cập nhật'} buổi`}</dd>
                      </div>
                    </dl>
                    {packageItem.benefits && (
                      <p className="member-package-benefits">
                        <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                        <span><strong>Quyền lợi:</strong> {packageItem.benefits}</span>
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
                      disabled={Boolean(pendingSubscription)}
                      onClick={() => openRegistration(packageItem)}
                      type="button"
                    >
                      {activeSubscription ? 'Chọn gói gia hạn' : 'Chọn gói'} <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {!catalogError && !catalogLoading && visiblePackageCount > 20 && (
          <div className="member-package-pagination">
            <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Trang trước</button>
            <span>Trang {page + 1} / {Math.ceil(totalPackages / 20)}</span>
            <button
              type="button"
              disabled={(page + 1) * 20 >= visiblePackageCount}
              onClick={() => setPage((value) => value + 1)}
            >
              Trang sau
            </button>
          </div>
        )}
      </section>

      {selectedPackage && (
        <Modal
          busy={registrationLoading}
          className="member-package-modal"
          onClose={closeRegistration}
          title="Xác nhận đăng ký gói"
        >
          <form onSubmit={submitRegistration}>
            {memberId && <ReceptionistMemberContext memberId={memberId} />}
            <p className="member-package-modal-name">{selectedPackage.name}</p>
            <p className="member-package-modal-price">{priceFormatter.format(Number(selectedPackage.price || 0))}</p>
            {packageDetailLoading && <p className="member-package-note" role="status">Đang tải quyền lợi và môn học của gói...</p>}
            {!packageDetailLoading && selectedPackage.includedSports?.length > 0 && (
              <section className="member-package-choice-section" aria-label="Môn học được bao gồm">
                <h4>Môn học đã bao gồm</h4>
                <div className="member-package-sport-tags">
                  {selectedPackage.includedSports.map((sport) => <span key={sport.id}>{sport.name}</span>)}
                </div>
              </section>
            )}
            {!packageDetailLoading && (selectedPackage.choiceGroups || []).map((group) => (
              <fieldset className="member-package-choice-section" key={group.id}>
                <legend>{group.name} <small>Chọn đúng {group.requiredSelection} môn</small></legend>
                {group.description && <p>{group.description}</p>}
                <div className="member-package-sport-options">
                  {(group.sports || []).map((sport) => {
                    const checked = (choiceSelection[group.id] || []).includes(sport.id)
                    return (
                      <label className={checked ? 'is-selected' : ''} key={sport.id}>
                        <input checked={checked} disabled={registrationLoading || renewalPreviewLoading || (!checked && (choiceSelection[group.id] || []).length >= group.requiredSelection)} onChange={() => toggleChoiceSport(group, sport.id)} type="checkbox" />
                        <span>{sport.name}</span>
                      </label>
                    )
                  })}
                </div>
                <small className="member-package-choice-count">Đã chọn {(choiceSelection[group.id] || []).length}/{group.requiredSelection}</small>
              </fieldset>
            ))}
            {selectedPackage.isRenewal && (
              <label className="member-package-payment-field">
                Thời điểm bắt đầu gói mới
                <select disabled={registrationLoading || renewalPreviewLoading} onChange={(event) => { setRenewalStart(event.target.value); setRenewalPreview(null) }} value={renewalStart}>
                  <option value="IMMEDIATE">Bắt đầu ngay</option>
                  <option value="AFTER_CURRENT">Sau khi gói hiện tại kết thúc</option>
                </select>
              </label>
            )}
            {renewalPreview && (
              <div className="member-package-renewal-preview" role="status">
                <strong>Kiểm tra thông tin gia hạn</strong>
                <span>Hiệu lực: {formatDate(renewalPreview.newStartDate)} – {formatDate(renewalPreview.newEndDate)}</span>
                <span>Giá gói: {priceFormatter.format(Number(renewalPreview.listedPrice || 0))}</span>
                <span>Ưu đãi: {priceFormatter.format(Number(renewalPreview.discountAmount || 0))}</span>
                <b>Cần thanh toán: {priceFormatter.format(Number(renewalPreview.totalAmount || 0))}</b>
              </div>
            )}
            <label className="member-package-payment-field">
              Hình thức thanh toán
              <select
                disabled={registrationLoading}
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
                : 'Lưu ý: Backend hiện ghi nhận thanh toán là đã trả ngay khi đăng ký; cổng thanh toán chưa được tích hợp. Chỉ xác nhận khi bạn đã thanh toán theo hình thức đã chọn.'}
            </p>
            {registrationError && <p className="member-package-form-error" role="alert">{registrationError}</p>}
            <div className="member-package-modal-actions">
              <button className="member-package-cancel" disabled={registrationLoading || renewalPreviewLoading} onClick={closeRegistration} type="button">
                Hủy
              </button>
              <button className="member-class-search-button" disabled={packageDetailLoading || registrationLoading || renewalPreviewLoading} type="submit">
                {registrationLoading ? 'Đang xử lý...' : renewalPreviewLoading ? 'Đang tính...' : selectedPackage.isRenewal && !renewalPreview ? 'Kiểm tra gia hạn' : selectedPackage.isRenewal ? 'Xác nhận gia hạn' : memberId && paymentMethod === 'Cash' ? 'Xác nhận đã nhận tiền' : 'Xác nhận đăng ký'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  )
}
