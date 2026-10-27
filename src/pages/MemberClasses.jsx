import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import Modal from '../components/Modal'
import RegisteredClassCard from '../components/RegisteredClassCard'
import { formatClassDate } from '../utils/classSchedule'
import memberMenuItems from '../components/memberMenuItems'
import { getVnpayPaymentUrl, isValidPaymentId, paymentApiErrorMessage } from '../services/memberPaymentService'
import {
  classApiErrorMessage,
  getAvailableClasses,
  getMyClassList,
  cancelClassRegistration,
  getClassConfirmation,
  registerForClass,
} from '../services/memberClassService'
import { staffMenuItems } from '../components/staffMenuItems'
import { ROLES } from '../auth/roleConfig'
import ReceptionistMemberContext from '../components/ReceptionistMemberContext'
import { getReceptionistClasses, getReceptionistPreview, registerReceptionistClass,
  getReceptionistRegistrations, cancelReceptionistClass } from '../services/receptionistRegistrationService'
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

export default function MemberClasses({ receptionist = false, memberId = null } = {}) {
  const navigate = useNavigate()
  const profilePath = receptionist ? `/receptionist/members/${memberId}` : '/member/schedule'
  const [classes, setClasses] = useState([])
  const [activeTab, setActiveTab] = useState(receptionist ? 'available' : 'registered')
  const [registeredClasses, setRegisteredClasses] = useState([])
  const [counts, setCounts] = useState({})
  const [registrationStatus, setRegistrationStatus] = useState('all')
  const [detailRegistration, setDetailRegistration] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelError, setCancelError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)
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
  const [paymentChannel, setPaymentChannel] = useState('Card')
  const [successMessage, setSuccessMessage] = useState('')
  const submitting = useRef(false)
  const previewRequest = useRef(0)

  useEffect(() => {
    const controller = new AbortController()

    const loadRegistered = memberId ? (options) => getReceptionistRegistrations(memberId, options) : getMyClassList
    const loadAvailable = memberId ? getReceptionistClasses : getAvailableClasses
    const request = activeTab === 'registered'
      ? loadRegistered({ search: submittedSearch, status: registrationStatus, signal: controller.signal })
      : loadAvailable({ search: submittedSearch, signal: controller.signal })
    request.then((result) => {
      if (controller.signal.aborted) return
      if (activeTab === 'registered') { setRegisteredClasses(result.classes); setCounts(result.counts) }
      else setClasses(result)
    })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(classApiErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [reloadKey, submittedSearch, activeTab, registrationStatus, memberId])

  function changeTab(tab) {
    if (tab === activeTab) return
    setActiveTab(tab)
    setLoading(true)
    setLoadError('')
    setSearch('')
    setSubmittedSearch('')
  }

  function askToCancelRegistration(item) {
    if (cancellingId != null) return
    setCancelTarget(item)
    setCancelError('')
  }

  function closeCancelConfirmation() {
    if (cancellingId != null) return
    setCancelTarget(null)
    setCancelError('')
  }

  async function confirmCancellation() {
    if (!cancelTarget || cancellingId != null) return
    if (cancelTarget.bookingId == null) {
      setCancelError('Không tìm thấy thông tin đăng ký lớp để hủy.')
      return
    }

    setCancellingId(cancelTarget.bookingId)
    setCancelError('')
    try {
      const result = await (memberId ? cancelReceptionistClass(memberId, cancelTarget.bookingId) : cancelClassRegistration(cancelTarget.bookingId))
      setSuccessMessage(result.message || 'Đã hủy các buổi còn lại của đăng ký.')
      setCancelTarget(null)
      setLoading(true)
      setReloadKey((key) => key + 1)
    } catch (error) { setCancelError(classApiErrorMessage(error)) }
    finally { setCancellingId(null) }
  }

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
    if (receptionist) {
      navigate(`/receptionist/members/${memberId}/checkout/classes/${classItem.classId}`)
      return
    }
    const requestId = ++previewRequest.current
    setSuccessMessage('')
    setSelectedClass(classItem)
    setConfirmation(null)
    setConfirmationLoading(true)
    setModalError('')
    setPaymentChannel('Card')
    try {
      const details = await (memberId ? getReceptionistPreview(memberId, classItem.classId) : getClassConfirmation(classItem.classId))
      if (requestId !== previewRequest.current) return
      setConfirmation(details)
      setPaymentMethod(details.packageOption?.eligible ? 'PACKAGE' : 'DIRECT')
    } catch (error) {
      if (requestId !== previewRequest.current) return
      setModalError(classApiErrorMessage(error))
    } finally {
      if (requestId === previewRequest.current) setConfirmationLoading(false)
    }
  }

  function closeRegistration() {
    if (bookingLoading) return
    previewRequest.current += 1
    setSelectedClass(null)
    setConfirmation(null)
    setModalError('')
  }

  async function submitRegistration(event) {
    event.preventDefault()
    if (submitting.current || bookingLoading || !selectedClass || !confirmation) return

    submitting.current = true
    setBookingLoading(true)
    setModalError('')
    try {
      const register = memberId ? (classId, payload) => registerReceptionistClass(memberId, classId, payload) : registerForClass
      const result = await register(selectedClass.classId, {
        paymentMethod,
        ...(paymentMethod === 'DIRECT' ? { paymentChannel } : {}),
      })
      if (paymentMethod === 'DIRECT' && paymentChannel === 'E_Wallet') {
        if (result.paymentStatus !== 'Pending' || !isValidPaymentId(String(result.paymentId))) {
          throw new Error('Chưa thể mở thanh toán QR. Vui lòng kiểm tra đăng ký trước khi thử lại.')
        }
        window.location.assign(`${memberId ? `/receptionist/members/${memberId}` : "/member"}/payment-result?paymentId=${result.paymentId}`)
        return
      }
      if (result.paymentUrl || (paymentMethod === 'DIRECT' && paymentChannel === 'Card')) {
        window.location.assign(getVnpayPaymentUrl(result.paymentUrl))
        return
      }
      setSuccessMessage(result.message || `Đăng ký lớp ${result.className || selectedClass.name} thành công.`)
      setLoading(true)
      setLoadError('')
      setSelectedClass(null)
      setConfirmation(null)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setModalError(paymentApiErrorMessage(error))
    } finally {
      submitting.current = false
      setBookingLoading(false)
    }
  }

  return (
    <DashboardLayout
      eyebrow={receptionist ? 'Lễ tân / Đăng ký lớp cho hội viên' : 'Hội viên / Lớp học'}
      menuItems={receptionist ? staffMenuItems[ROLES.RECEPTIONIST] : memberMenuItems}
      role={receptionist ? "Receptionist" : "Hội viên"}
      showIntro={false}
      title="Lớp học"
    >
      <div className="member-classes-page">
      {memberId && <ReceptionistMemberContext memberId={memberId} />}
      <section className="member-page-heading">
        <div>
          <span className="section-heading-kicker">KHÁM PHÁ BỘ MÔN</span>
          <h2>{receptionist ? 'Lớp học của hội viên' : 'Lớp học của tôi'}</h2>
          <p>Theo dõi lịch tập, trạng thái và thông tin các lớp bạn đã đăng ký.</p>
        </div>
        <button className="member-register-button member-class-heading-action" type="button"
          onClick={() => changeTab(activeTab === 'registered' ? 'available' : 'registered')}>
          <span className="material-symbols-outlined" aria-hidden="true">
            {activeTab === 'registered' ? 'add' : 'arrow_back'}
          </span>
          {activeTab === 'registered' ? 'Đăng ký lớp' : 'Lớp đã đăng ký'}
        </button>
      </section>

      <div className="member-class-list-toolbar">
        {activeTab === 'registered' && (
          <div className="member-registration-filter" role="group" aria-label="Lọc lớp theo trạng thái">
            {[
              { value: 'all', label: 'Tất cả', count: counts.all },
              { value: 'ongoing', label: 'Đang học', count: counts.ongoing },
              { value: 'completed', label: 'Hoàn thành', count: counts.completed },
              { value: 'cancelled', label: 'Đã hủy', count: counts.cancelled },
              { value: 'Pending', label: 'Chờ thanh toán' },
            ].map((filter) => (
              <button key={filter.value} type="button" aria-pressed={registrationStatus === filter.value}
                onClick={() => {
                  setRegistrationStatus(filter.value)
                  setLoading(true)
                  setLoadError('')
                }}>
                {filter.label}{filter.count != null ? ` (${filter.count})` : ''}
              </button>
            ))}
          </div>
        )}

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
            {loading ? 'Đang tải lớp...' : activeTab === 'registered' ? `${registeredClasses.length} đăng ký` : `${classes.length} lớp đang mở`}
          </span>
        </form>
      </div>

      {successMessage && (
        <section className="member-registration-success" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
          <span>{successMessage} <Link to={profilePath}>{receptionist ? 'Về thông tin hội viên' : 'Thời khóa biểu'}</Link>.</span>
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

      {activeTab === 'registered' && !loadError && !loading && <section aria-label="Lớp đã đăng ký">
        {registeredClasses.length === 0 ? <div className="member-class-empty">
          <h3>Chưa có đăng ký phù hợp</h3><p>Các lớp bạn đã đăng ký sẽ hiển thị ở đây, kể cả khi đã kết thúc.</p>
          <button className="member-register-button" type="button" onClick={() => changeTab('available')}>Tìm lớp để đăng ký</button>
        </div> : <div className="member-class-table-wrap">
          <table className="member-registrations-table">
            <thead>
              <tr>
                <th scope="col">Tên lớp</th>
                <th scope="col">Mã lớp</th>
                <th scope="col">Lịch tập</th>
                <th scope="col">Khung giờ</th>
                <th scope="col">Huấn luyện viên</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {registeredClasses.map((item) => <RegisteredClassCard key={item.registrationId ?? item.bookingId} item={item}
                busy={cancellingId === item.bookingId} onDetail={setDetailRegistration} onCancel={askToCancelRegistration}
                paymentBasePath={memberId ? `/receptionist/members/${memberId}` : '/member'}
                onRebook={(registration) => openRegistration({ classId: registration.classId })} />)}
            </tbody>
          </table>
        </div>}
      </section>}

      {activeTab === 'available' && !loadError && !loading && classes.length === 0 && (
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

      {activeTab === 'available' && !loadError && !loading && classes.length > 0 && (
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
                  Giá niêm yết: {classItem.priceFormatted || (classItem.price == null ? 'Liên hệ trung tâm' : priceFormatter.format(classItem.price))}
                </strong>
                {classItem.packageNote && <small className="member-class-package-note">{classItem.packageNote}</small>}
                <button
                  className="member-register-button"
                  disabled={!classItem.canRegister || classItem.enrolled || Boolean(selectedClass)}
                  type="button"
                  onClick={() => openRegistration(classItem)}
                >
                  {classItem.enrolled ? 'Đã đăng ký' : classItem.canRegister ? 'Đăng ký lớp'
                    : classItem.sessionId === null ? 'Không còn buổi học' : 'Hết chỗ'}
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
          <p>Sau khi đăng ký thành công, lớp sẽ hiển thị trong <Link to={profilePath}>Lịch tập</Link>.</p>
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
            <form onSubmit={submitRegistration} aria-busy={bookingLoading}>
              <h4>{confirmation.className}</h4>
              {memberId && <p><strong>Hội viên:</strong> {confirmation.memberName} · #{memberId}</p>}
              <p>{confirmation.schedule}</p>
              <p><strong>Huấn luyện viên:</strong> {confirmation.coachName || 'Chưa cập nhật'}</p>
              <p><strong>Phòng:</strong> {confirmation.roomName || 'Chưa xác định'}</p>
              <div className="member-registration-summary">
                <p><strong>Số buổi còn lại:</strong> {confirmation.sessionCount ?? 1}</p>
                {confirmation.packageOption?.eligible ? (
                  <div className="member-package-covered-notice" role="status">
                    <span className="material-symbols-outlined" aria-hidden="true">verified</span>
                    <div>
                      <strong>Đã bao gồm trong gói {confirmation.packageOption.packageName || ''}</strong>
                      <p>{confirmation.packageOption.subtitle || 'Không thu thêm học phí cho lớp này.'}</p>
                    </div>
                    <b>0 ₫ thêm</b>
                  </div>
                ) : (
                  <>
                    <p><strong>Giá niêm yết mỗi buổi:</strong> {priceFormatter.format(confirmation.price || 0)}</p>
                    <p><strong>Học phí trực tiếp:</strong> {priceFormatter.format(confirmation.totalAmount ?? confirmation.price ?? 0)}</p>
                    {confirmation.packageOption?.subtitle && (
                      <p className="member-package-unavailable-note"><strong>Quyền lợi gói:</strong> {confirmation.packageOption.subtitle}</p>
                    )}
                  </>
                )}
                <p><strong>Thời hạn:</strong> {formatClassDate(confirmation.startDate)} – {formatClassDate(confirmation.endDate)}</p>
                {confirmation.sessions?.length > 0 && <details><summary>Các buổi được đăng ký</summary>
                  <ul>{confirmation.sessions.map((session) => <li key={session.sessionId}>
                    {formatClassDate(session.sessionDate)} · {session.sessionStartTime}–{session.sessionEndTime}{session.availableSeats != null && ` · Còn ${session.availableSeats} chỗ`}
                  </li>)}</ul>
                </details>}
              </div>
              {memberId && <div role="status">
                <p>{confirmation.alreadyRegistered ? 'Hội viên đã đăng ký lớp này.' : 'Hội viên chưa đăng ký lớp này.'}</p>
                <p>Gói hiện tại: {confirmation.packageName || 'Không có gói hoạt động'} · Còn {confirmation.remainingPackageClasses ?? 0} buổi · Cần {confirmation.requiredPackageClasses} buổi.</p>
                <p>Điều kiện: đủ lượt và gói có hiệu lực đến buổi cuối cùng của lớp.</p>
                {!confirmation.canPayWithPackage && <p>Không thể dùng gói: {confirmation.message}</p>}
              </div>}
              <fieldset className="member-payment-options" disabled={bookingLoading}>
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
                    {` · Dùng ${confirmation.packageOption.requiredSessions ?? confirmation.sessionCount ?? 1} buổi`}
                    {confirmation.packageOption.remainingSessions != null && ` · Còn ${confirmation.packageOption.remainingSessions} buổi`}
                  </label>
                )}
                {confirmation.directPaymentOption?.available && !confirmation.packageOption?.eligible && (
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
              {paymentMethod === 'DIRECT' && confirmation.directPaymentOption?.available && !confirmation.packageOption?.eligible && (
                <label className="member-payment-channel">
                  Kênh thanh toán
                  <select disabled={bookingLoading} value={paymentChannel} onChange={(event) => setPaymentChannel(event.target.value)}>
                    {memberId && <option value="Cash">Thanh toán tại quầy — Tiền mặt</option>}
                    <option value="Card">Thẻ ATM qua VNPay</option>
                    <option value="E_Wallet">Ví điện tử</option>
                  </select>
                </label>
              )}
              {paymentMethod === 'DIRECT' && paymentChannel === 'Card' && (
                <p role="note">Bạn sẽ được chuyển tới VNPay để thanh toán bằng thẻ ATM. Đây là môi trường thanh toán thử nghiệm.</p>
              )}
              {paymentMethod === 'DIRECT' && paymentChannel === 'E_Wallet' && (
                <p role="note">Thanh toán bằng QR chuyển khoản qua SePay. Đăng ký chỉ được xác nhận sau khi hệ thống nhận thanh toán.</p>
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
                  {bookingLoading ? <span role="status">Đang xử lý đăng ký...</span> : memberId && paymentMethod === 'DIRECT' && paymentChannel === 'Cash' ? 'Xác nhận đã nhận tiền' : 'Xác nhận đăng ký'}
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
      {cancelTarget && (
        <Modal
          busy={cancellingId === cancelTarget.bookingId}
          className="member-cancel-confirm-modal"
          onClose={closeCancelConfirmation}
          title={<><span className="member-cancel-modal-icon material-symbols-outlined" aria-hidden="true">warning</span>Xác nhận hủy lớp học</>}
        >
          {memberId && <ReceptionistMemberContext memberId={memberId} />}
          <p className="member-cancel-confirm-question">Bạn có chắc chắn muốn hủy đăng ký lớp học này không?</p>
          <dl className="member-cancel-class-summary">
            <div><dt>Lớp:</dt><dd>{cancelTarget.className || 'Chưa cập nhật'}</dd></div>
            <div><dt>Mã lớp:</dt><dd>{cancelTarget.classCode || 'Chưa cập nhật'}</dd></div>
            <div><dt>Thời gian:</dt><dd>{[cancelTarget.schedule, cancelTarget.timeSlot].filter(Boolean).join(' · ') || 'Chưa cập nhật'}</dd></div>
            <div><dt>HLV hướng dẫn:</dt><dd>{cancelTarget.coachName || 'Chưa cập nhật'}</dd></div>
          </dl>
          <p className="member-cancel-policy-note">
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
            <span>Lưu ý: Các buổi tương lai sẽ được hủy và trả lượt nếu dùng gói; các buổi đã học vẫn giữ trong lịch sử. Tiền đã thu chỉ được đánh dấu cần đối soát, chưa tự động hoàn tiền.</span>
          </p>
          {cancelError && <div className="member-class-state member-class-error" role="alert">{cancelError}</div>}
          <div className="member-booking-actions">
            <button className="member-cancel-button" disabled={cancellingId != null} onClick={closeCancelConfirmation} type="button">
              Đóng
            </button>
            <button className="member-cancel-confirm-button" disabled={cancellingId != null} onClick={confirmCancellation} type="button">
              {cancellingId != null ? 'Đang hủy...' : 'Xác nhận hủy'}
            </button>
          </div>
        </Modal>
      )}
      {detailRegistration && <Modal title={`Các buổi lớp ${detailRegistration.className}`} onClose={() => setDetailRegistration(null)}>
        <p>{detailRegistration.status} · {detailRegistration.sessionCount ?? detailRegistration.sessions?.length ?? 1} buổi</p>
        <ul className="member-registration-session-list">
          {(detailRegistration.sessions || [detailRegistration]).map((session) => <li key={session.sessionId ?? session.sessionDate}>
            <strong>{formatClassDate(session.sessionDate)}</strong>
            <span>{session.sessionStartTime}–{session.sessionEndTime}</span>
            <span>{session.rawStatus === 'Cancelled' || session.sessionStatus === 'Cancelled' ? 'Đã hủy'
              : session.rawStatus === 'Pending' ? 'Chờ thanh toán' : session.rawStatus === 'Completed' ? 'Đã hoàn thành' : 'Đã xác nhận'}</span>
          </li>)}
        </ul>
        <div className="member-booking-actions"><button className="member-cancel-button" type="button" onClick={() => setDetailRegistration(null)}>Đóng</button></div>
      </Modal>}
      </div>
    </DashboardLayout>
  )
}
