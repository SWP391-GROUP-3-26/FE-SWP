import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import memberMenuItems from '../components/memberMenuItems'
import { getAuth } from '../auth/authStorage'
import {
  getMyMemberPackageSubscriptions,
  memberPackageApiErrorMessage,
} from '../services/memberPackageService'
import basicPackageImage from '../assets/member-package-basic.jpg'
import centerWorkoutImage from '../assets/center-manager-dashboard.jpg'
import premierPackageImage from '../assets/member-package-premier.jpg'
import standardPackageImage from '../assets/member-package-standard.jpg'
import './MemberActivities.css'
import './MemberPackages.css'
import './MemberPackageHistory.css'

const pageSize = 12
const priceFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function packageImageFor(subscription) {
  const name = String(subscription.packageName || '')
  const days = Number(subscription.durationDays)
  if (/basic/i.test(name) || days === 30) return basicPackageImage
  if (/standard/i.test(name) || days === 90) return standardPackageImage
  if (/premier|premium/i.test(name) || [365, 730].includes(days)) return premierPackageImage
  return centerWorkoutImage
}

function durationLabel(days) {
  if (days === 365) return '12 tháng'
  if (days === 730) return '24 tháng'
  if (days > 0 && days % 30 === 0) return `${days / 30} tháng`
  return days ? `${days} ngày` : 'Gói hội viên'
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật'
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).slice(0, 10))
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function subscriptionStatusLabel(status) {
  const labels = {
    active: 'Đang hoạt động',
    pending: 'Chờ xử lý',
    expired: 'Đã hết hạn',
    cancelled: 'Đã hủy',
    canceled: 'Đã hủy',
  }
  return labels[String(status || '').toLowerCase()] || status || 'Chưa cập nhật'
}

function paymentStatusLabel(status) {
  const labels = {
    paid: 'Đã thanh toán',
    pending: 'Chờ thanh toán',
    failed: 'Thanh toán thất bại',
    refunded: 'Đã hoàn tiền',
  }
  return labels[String(status || '').toLowerCase()] || status || 'Chưa ghi nhận'
}

function paymentMethodLabel(method) {
  const labels = {
    Card: 'Thẻ VNPay',
    E_Wallet: 'QR chuyển khoản qua SePay',
    Cash: 'Tiền mặt',
    Bank_Transfer: 'Chuyển khoản',
  }
  return labels[method] || method || 'Chưa ghi nhận'
}

export default function MemberPackageHistory() {
  const [authIdentity, setAuthIdentity] = useState(() => getAuth().userId || 'anonymous')
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState(null)
  const requestKey = JSON.stringify([authIdentity, page, reloadKey])
  const currentResult = result?.key === requestKey ? result : null

  useEffect(() => {
    function syncAuthIdentity(event) {
      if (event.key && !['accessToken', 'userId'].includes(event.key)) return
      setAuthIdentity(getAuth().userId || 'anonymous')
      setPage(0)
    }
    window.addEventListener('storage', syncAuthIdentity)
    return () => window.removeEventListener('storage', syncAuthIdentity)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getMyMemberPackageSubscriptions({ page, size: pageSize, signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data: response })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, error: memberPackageApiErrorMessage(error) })
        }
      })
    return () => controller.abort()
  }, [page, reloadKey, requestKey])

  const subscriptions = currentResult?.data?.data || []
  const total = currentResult?.data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const firstItem = total ? page * pageSize + 1 : 0
  const lastItem = Math.min((page + 1) * pageSize, total)

  return (
    <DashboardLayout
      eyebrow="Hội viên / Gói tập / Lịch sử đăng ký"
      menuItems={memberMenuItems}
      role="Hội viên"
      showIntro={false}
      title="Lịch sử đăng ký gói"
    >
      <section className="member-page-heading member-package-history-intro">
        <div>
          <span className="section-heading-kicker">THẺ HỘI VIÊN</span>
          <h2>Lịch sử đăng ký gói</h2>
          <p>Theo dõi các gói đã đăng ký, trạng thái thanh toán và những gói đã hủy.</p>
        </div>
        <Link className="member-package-history-back" to="/member/packages">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          Quay lại gói tập
        </Link>
      </section>

      <section className="member-data-section member-package-section member-package-history-section" aria-labelledby="member-package-history-title">
        <div className="member-data-section-heading">
          <div>
            <span className="section-heading-kicker">CÁC LẦN ĐĂNG KÝ</span>
            <h3 id="member-package-history-title">Danh sách gói đã đăng ký</h3>
          </div>
          {currentResult?.data && <span className="member-package-total">{total} gói</span>}
        </div>

        {!currentResult && <div className="member-package-state" role="status">Đang tải lịch sử gói tập...</div>}

        {currentResult?.error && (
          <div className="member-package-state is-error" role="alert">
            <span>{currentResult.error}</span>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button>
          </div>
        )}

        {currentResult?.data && total === 0 && (
          <div className="member-package-history-empty">
            <span className="material-symbols-outlined" aria-hidden="true">history</span>
            <h4>Chưa có lịch sử đăng ký</h4>
            <p>Các gói bạn đăng ký sẽ xuất hiện tại đây, kể cả khi gói đã bị hủy.</p>
            <Link className="member-package-history-link" to="/member/packages">Xem các gói đang mở bán</Link>
          </div>
        )}

        {currentResult?.data && subscriptions.length > 0 && (
          <>
            <div className="member-package-history-grid">
              {subscriptions.map((subscription) => {
                const statusKey = String(subscription.subscriptionStatus || '').toLowerCase()
                return (
                  <article className="member-subscription-card member-package-history-card" key={subscription.subscriptionId}>
                    <div className="member-package-image member-subscription-image">
                      <img src={packageImageFor(subscription)} alt={`Hình minh họa gói ${subscription.packageName}`} loading="lazy" />
                      <span>{durationLabel(Number(subscription.durationDays))}</span>
                    </div>
                    <div className="member-subscription-content">
                      <div className="member-subscription-heading">
                        <span className="member-package-code">MÃ ĐĂNG KÝ #{subscription.subscriptionId}</span>
                        <span className={`member-package-status status-${statusKey}`}>
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
                          <dd>{paymentStatusLabel(subscription.paymentStatus)} · {paymentMethodLabel(subscription.paymentMethod)}</dd>
                        </div>
                      </dl>
                    </div>
                  </article>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="member-package-pagination" aria-label="Phân trang lịch sử gói">
                <span>Hiển thị {firstItem}–{lastItem} trong {total} gói</span>
                <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Trang trước</button>
                <strong>Trang {page + 1}/{totalPages}</strong>
                <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>Trang sau</button>
              </div>
            )}
          </>
        )}
      </section>
    </DashboardLayout>
  )
}
