import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import Modal from '../components/Modal'
import memberMenuItems from '../components/memberMenuItems'
import {
  classApiErrorMessage,
  getAvailableClasses,
  getClassConfirmation,
  registerForClass,
} from '../services/memberClassService'
import './MemberActivities.css'

const priceFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function classSchedule(classItem) {
  const days = classItem.daysOfWeek
    ? String(classItem.daysOfWeek).split(',').map((day) => day.trim()).filter(Boolean).join(', ')
    : 'Chưa cập nhật ngày học'
  const times = [classItem.startTime, classItem.endTime]
    .filter(Boolean)
    .map((time) => String(time).slice(0, 5))
    .join(' - ')
  return times ? `${days} · ${times}` : days
}

export default function MemberClasses() {
  const [classes, setClasses] = useState([])
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedClass, setSelectedClass] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [confirmationLoading, setConfirmationLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [modalError, setModalError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('DIRECT')
  const [paymentChannel, setPaymentChannel] = useState('Bank_Transfer')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    getAvailableClasses({ search: submittedSearch, signal: controller.signal })
      .then(setClasses)
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(classApiErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [reloadKey, submittedSearch])

  function handleSearch(event) {
    event.preventDefault()
    setLoading(true)
    setLoadError('')
    setSuccessMessage('')
    if (search === submittedSearch) {
      setReloadKey((key) => key + 1)
    } else {
      setSubmittedSearch(search)
    }
  }

  function retryLoading() {
    setLoading(true)
    setLoadError('')
    setReloadKey((key) => key + 1)
  }

  async function openRegistration(classItem) {
    setSelectedClass(classItem)
    setConfirmation(null)
    setConfirmationLoading(true)
    setModalError('')
    setPaymentChannel('Bank_Transfer')
    try {
      const details = await getClassConfirmation(classItem.classId)
      setConfirmation(details)
      setPaymentMethod(details.packageOption?.eligible ? 'PACKAGE' : 'DIRECT')
    } catch (error) {
      setModalError(classApiErrorMessage(error))
    } finally {
      setConfirmationLoading(false)
    }
  }

  function closeRegistration() {
    if (bookingLoading) return
    setSelectedClass(null)
    setConfirmation(null)
    setModalError('')
  }

  async function submitRegistration(event) {
    event.preventDefault()
    if (!selectedClass || !confirmation) return

    setBookingLoading(true)
    setModalError('')
    try {
      const result = await registerForClass(selectedClass.classId, {
        paymentMethod,
        ...(paymentMethod === 'DIRECT' ? { paymentChannel } : {}),
      })
      setSuccessMessage(result.message || `Đăng ký lớp ${result.className || selectedClass.name} thành công.`)
      setSelectedClass(null)
      setConfirmation(null)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setModalError(classApiErrorMessage(error))
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <DashboardLayout
      eyebrow="Hội viên / Lớp học"
      menuItems={memberMenuItems}
      role="Hội viên"
      showIntro={false}
      title="Lớp học"
    >
      <section className="member-page-heading">
        <div>
          <span className="section-heading-kicker">KHÁM PHÁ BỘ MÔN</span>
          <h2>Đăng ký lớp học</h2>
          <p>Tìm lớp phù hợp, chọn hình thức thanh toán và thêm lớp đã đăng ký vào thời khóa biểu.</p>
        </div>
        <span className="member-page-heading-icon material-symbols-outlined" aria-hidden="true">sports_gymnastics</span>
      </section>

      <form className="member-class-search" aria-label="Tìm kiếm lớp học" onSubmit={handleSearch}>
        <label className="member-class-search-input">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input
            aria-label="Tìm lớp, môn học, huấn luyện viên hoặc phòng"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm lớp, môn học, huấn luyện viên hoặc phòng"
            value={search}
          />
        </label>
        <button className="member-class-search-button" disabled={loading} type="submit">
          Tìm kiếm
        </button>
        <span className="member-class-count">
          {loading ? 'Đang tải lớp...' : `${classes.length} lớp đang mở`}
        </span>
      </form>

      {successMessage && (
        <section className="member-registration-success" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
          <span>{successMessage} Lớp đã được ghi nhận, xem tại <Link to="/member/schedule">Thời khóa biểu</Link>.</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setSuccessMessage('')}>×</button>
        </section>
      )}

      {loadError && (
        <section className="member-class-state member-class-error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={retryLoading}>Thử lại</button>
        </section>
      )}

      {!loadError && loading && (
        <div className="member-class-state" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">progress_activity</span>
          Đang tải danh sách lớp từ UniSports...
        </div>
      )}

      {!loadError && !loading && classes.length === 0 && (
        <section className="member-class-empty">
          <span className="member-class-empty-icon material-symbols-outlined" aria-hidden="true">event_busy</span>
          <span className="section-heading-kicker">LỚP HỌC UNISPORTS</span>
          <h3>{submittedSearch ? 'Không tìm thấy lớp phù hợp' : 'Hiện chưa có lớp đang hoạt động'}</h3>
          <p>
            {submittedSearch
              ? 'Thử tìm bằng tên lớp, môn học, huấn luyện viên hoặc phòng tập khác.'
              : 'Danh sách lớp đang hoạt động sẽ xuất hiện tại đây khi backend có dữ liệu.'}
          </p>
        </section>
      )}

      {!loadError && !loading && classes.length > 0 && (
        <section className="member-class-grid" aria-label="Danh sách lớp đang hoạt động">
          {classes.map((classItem) => (
            <article className="member-class-card" key={classItem.classId}>
              <div className="member-class-card-heading">
                <span className="member-class-code">{classItem.classCode || `Lớp #${classItem.classId}`}</span>
                <span className="member-class-active">
                  {classItem.enrolled ? 'Đã đăng ký' : classItem.remainingSlotsText || 'Đang mở'}
                </span>
              </div>
              <h3>{classItem.name}</h3>
              <p className="member-class-subject">
                {classItem.subjectName || 'Chưa phân môn'}
                {classItem.category ? ` · ${classItem.category}` : ''}
              </p>
              <dl className="member-class-details">
                <div>
                  <dt><span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>Lịch học</dt>
                  <dd>{classSchedule(classItem)}</dd>
                </div>
                <div>
                  <dt><span className="material-symbols-outlined" aria-hidden="true">person</span>Huấn luyện viên</dt>
                  <dd>{classItem.coachName || 'Chưa phân công'}</dd>
                </div>
                <div>
                  <dt><span className="material-symbols-outlined" aria-hidden="true">location_on</span>Phòng</dt>
                  <dd>{classItem.roomName || 'Chưa xếp phòng'}</dd>
                </div>
                <div>
                  <dt><span className="material-symbols-outlined" aria-hidden="true">groups</span>Chỗ còn lại</dt>
                  <dd>{classItem.remainingSlots ?? classItem.maxCapacity ?? 'Chưa cập nhật'} chỗ còn lại</dd>
                </div>
              </dl>
              <div className="member-class-card-footer">
                <strong>
                  {classItem.priceFormatted || (classItem.price == null ? 'Liên hệ trung tâm' : priceFormatter.format(classItem.price))}
                </strong>
                <button
                  className="member-register-button"
                  disabled={!classItem.canRegister || classItem.enrolled || Boolean(selectedClass)}
                  type="button"
                  onClick={() => openRegistration(classItem)}
                >
                  {classItem.enrolled ? 'Đã đăng ký' : classItem.canRegister ? 'Đăng ký lớp' : 'Hết chỗ'}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      <aside className="member-policy-note">
        <span className="material-symbols-outlined" aria-hidden="true">verified_user</span>
        <div>
          <strong>Lớp đã đăng ký sẽ có trong thời khóa biểu</strong>
          <p>Sau khi đăng ký thành công, lớp sẽ hiển thị trong <Link to="/member/schedule">Lịch tập</Link>.</p>
        </div>
      </aside>

      {selectedClass && (
        <Modal
          busy={bookingLoading}
          className="member-booking-modal"
          onClose={closeRegistration}
          title="Xác nhận đăng ký lớp"
        >
          {confirmationLoading ? (
            <div className="member-class-state" role="status">Đang tải thông tin đăng ký...</div>
          ) : confirmation ? (
            <form onSubmit={submitRegistration}>
              <h4>{confirmation.className}</h4>
              <p>{confirmation.schedule}</p>
              <p><strong>Huấn luyện viên:</strong> {confirmation.coachName || 'Chưa cập nhật'}</p>
              <p><strong>Phòng:</strong> {confirmation.roomName || 'Chưa xác định'}</p>
              <fieldset className="member-payment-options">
                <legend>Hình thức thanh toán</legend>
                {confirmation.packageOption?.eligible && (
                  <label>
                    <input
                      checked={paymentMethod === 'PACKAGE'}
                      name="paymentMethod"
                      onChange={() => setPaymentMethod('PACKAGE')}
                      type="radio"
                      value="PACKAGE"
                    />
                    {confirmation.packageOption.title || 'Trừ gói hội viên'}
                    {confirmation.packageOption.remainingSessions != null && ` · Còn ${confirmation.packageOption.remainingSessions} buổi`}
                  </label>
                )}
                {confirmation.directPaymentOption?.available && (
                  <label>
                    <input
                      checked={paymentMethod === 'DIRECT'}
                      name="paymentMethod"
                      onChange={() => setPaymentMethod('DIRECT')}
                      type="radio"
                      value="DIRECT"
                    />
                    {confirmation.directPaymentOption.title || 'Thanh toán trực tiếp'}
                    {confirmation.directPaymentOption.amountFormatted && ` · ${confirmation.directPaymentOption.amountFormatted}`}
                  </label>
                )}
              </fieldset>
              {paymentMethod === 'DIRECT' && confirmation.directPaymentOption?.available && (
                <label className="member-payment-channel">
                  Kênh thanh toán
                  <select value={paymentChannel} onChange={(event) => setPaymentChannel(event.target.value)}>
                    <option value="Bank_Transfer">Chuyển khoản</option>
                    <option value="Cash">Tiền mặt</option>
                    <option value="Card">Thẻ</option>
                    <option value="E_Wallet">Ví điện tử</option>
                  </select>
                </label>
              )}
              {!confirmation.packageOption?.eligible && !confirmation.directPaymentOption?.available && (
                <div className="member-class-state member-class-error" role="alert">
                  Hiện không có hình thức thanh toán khả dụng cho lớp này.
                </div>
              )}
              {modalError && <div className="member-class-state member-class-error" role="alert">{modalError}</div>}
              <div className="member-booking-actions">
                <button className="member-cancel-button" disabled={bookingLoading} onClick={closeRegistration} type="button">Hủy</button>
                <button
                  className="member-register-button"
                  disabled={bookingLoading || (!confirmation.packageOption?.eligible && !confirmation.directPaymentOption?.available)}
                  type="submit"
                >
                  {bookingLoading ? 'Đang đăng ký...' : 'Xác nhận đăng ký'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {modalError && <div className="member-class-state member-class-error" role="alert">{modalError}</div>}
              <div className="member-booking-actions">
                <button className="member-cancel-button" type="button" onClick={closeRegistration}>Đóng</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </DashboardLayout>
  )
}
