import { useEffect, useState } from 'react'
import basicPackageImage from '../assets/member-package-basic.jpg'
import centerWorkoutImage from '../assets/center-manager-dashboard.jpg'
import premierPackageImage from '../assets/member-package-premier.jpg'
import standardPackageImage from '../assets/member-package-standard.jpg'
import DashboardLayout from '../components/DashboardLayout'
import Modal from '../components/Modal'
import memberMenuItems from '../components/memberMenuItems'
import {
  getMemberPackageCatalog,
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
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
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

export default function MemberPackages() {
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
  const [successMessage, setSuccessMessage] = useState('')

  const catalogRequestKey = JSON.stringify([submittedSearch, page, reloadKey])
  const catalog = catalogResult?.key === catalogRequestKey ? catalogResult : null
  const subscriptions = subscriptionsResult?.key === reloadKey ? subscriptionsResult : null
  const packages = catalog?.data || []
  const totalPackages = catalog?.total || 0
  const catalogLoading = !catalog
  const subscriptionsLoading = !subscriptions
  const catalogError = catalog?.error || ''
  const subscriptionsError = subscriptions?.error || ''

  useEffect(() => {
    const controller = new AbortController()
    getMemberPackageCatalog({
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
  }, [catalogRequestKey, page, reloadKey, submittedSearch])

  useEffect(() => {
    const controller = new AbortController()
    getMyMemberPackageSubscriptions({ signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) {
        setSubscriptionsResult({ key: reloadKey, data: result.data })
      }
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setSubscriptionsResult({ key: reloadKey, error: memberPackageApiErrorMessage(error) })
      }
    })

    return () => controller.abort()
  }, [reloadKey])

  const activeSubscription = subscriptions?.data?.find(isCurrentlyActive)

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
    setSelectedPackage(packageItem)
    setPaymentMethod('Cash')
    setRegistrationError('')
  }

  function closeRegistration() {
    if (registrationLoading) return
    setSelectedPackage(null)
    setRegistrationError('')
  }

  async function submitRegistration(event) {
    event.preventDefault()
    if (!selectedPackage) return

    setRegistrationLoading(true)
    setRegistrationError('')
    try {
      const result = await registerMemberPackage({
        packageId: selectedPackage.id,
        paymentMethod,
      })
      setSuccessMessage(result.message || `Đăng ký gói "${selectedPackage.name}" thành công.`)
      setSelectedPackage(null)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setRegistrationError(memberPackageApiErrorMessage(error))
    } finally {
      setRegistrationLoading(false)
    }
  }

  return (
    <DashboardLayout
      eyebrow="Hội viên / Gói tập"
      menuItems={memberMenuItems}
      role="Hội viên"
      showIntro={false}
      title="Gói tập của tôi"
    >
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
          <span>{successMessage}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setSuccessMessage('')}>×</button>
        </section>
      )}

      <section className="member-data-section member-package-section">
        <div className="member-data-section-heading">
          <div>
            <span className="section-heading-kicker">THẺ HỘI VIÊN</span>
            <h3>Gói tập của tôi</h3>
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
              return (
                <article className="member-subscription-card" key={subscription.subscriptionId}>
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

        {activeSubscription && (
          <p className="member-package-note" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
            <span>
              <strong>Bạn đang có gói hoạt động đến {formatDate(activeSubscription.endDate)}.</strong>
              {' '}Hiện tại, bạn không được đăng ký gói mới khi gói này còn hiệu lực.
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

        {!catalogError && !catalogLoading && packages.length === 0 && (
          <EmptyState icon="inventory_2" title={submittedSearch ? 'Không tìm thấy gói phù hợp' : 'Chưa có gói đang mở bán'}>
            {submittedSearch
              ? 'Thử tìm với từ khóa khác.'
              : 'Các gói tập sẽ xuất hiện tại đây khi được mở bán.'}
          </EmptyState>
        )}

        {!catalogError && !catalogLoading && packages.length > 0 && (
          <div className="member-package-grid" aria-label="Danh sách gói đang mở bán">
            {packages.map((packageItem) => {
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
                    <span>{packageItem.includedClasses === 0 ? 'Tập luyện không giới hạn' : `${packageItem.includedClasses ?? 'Linh hoạt'} buổi tập`}</span>
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
                        <dd>{packageItem.includedClasses === 0 ? 'Không giới hạn' : `${packageItem.includedClasses ?? 'Chưa cập nhật'} buổi`}</dd>
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
                      disabled={Boolean(activeSubscription)}
                      onClick={() => openRegistration(packageItem)}
                      type="button"
                    >
                      Chọn gói <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
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

      {selectedPackage && (
        <Modal
          busy={registrationLoading}
          className="member-package-modal"
          onClose={closeRegistration}
          title="Xác nhận đăng ký gói"
        >
          <form onSubmit={submitRegistration}>
            <p className="member-package-modal-name">{selectedPackage.name}</p>
            <p className="member-package-modal-price">{priceFormatter.format(Number(selectedPackage.price || 0))}</p>
            <label className="member-package-payment-field">
              Hình thức thanh toán
              <select
                disabled={registrationLoading}
                onChange={(event) => setPaymentMethod(event.target.value)}
                value={paymentMethod}
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </label>
            <p className="member-package-payment-warning" role="note">
              Lưu ý: Backend hiện ghi nhận thanh toán là đã trả ngay khi đăng ký; cổng thanh toán chưa được tích hợp. Chỉ xác nhận khi bạn đã thanh toán theo hình thức đã chọn.
            </p>
            {registrationError && <p className="member-package-form-error" role="alert">{registrationError}</p>}
            <div className="member-package-modal-actions">
              <button className="member-package-cancel" disabled={registrationLoading} onClick={closeRegistration} type="button">
                Hủy
              </button>
              <button className="member-class-search-button" disabled={registrationLoading} type="submit">
                {registrationLoading ? 'Đang xử lý...' : 'Xác nhận đăng ký'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  )
}
