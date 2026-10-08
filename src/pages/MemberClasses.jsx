import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import memberMenuItems from '../components/memberMenuItems'
import { classApiErrorMessage, getAvailableClasses } from '../services/memberClassService'
import './MemberActivities.css'

const priceFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function classSchedule(classItem) {
  const days = Array.isArray(classItem.daysOfWeek) && classItem.daysOfWeek.length
    ? classItem.daysOfWeek.join(', ')
    : 'Chưa cập nhật ngày học'
  const times = [classItem.startTime, classItem.endTime].filter(Boolean).join(' - ')
  return times ? `${days} · ${times}` : days
}

export default function MemberClasses() {
  const [classes, setClasses] = useState([])
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

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
          <p>Tìm lớp phù hợp và xem lịch, huấn luyện viên cùng thông tin đăng ký.</p>
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
            <article className="member-class-card" key={classItem.id}>
              <div className="member-class-card-heading">
                <span className="member-class-code">{classItem.code || `Lớp #${classItem.id}`}</span>
                <span className="member-class-active">
                  {String(classItem.status).toLocaleLowerCase('vi') === 'open' ? 'Đang mở' : 'Đang hoạt động'}
                </span>
              </div>
              <h3>{classItem.name}</h3>
              <p className="member-class-subject">
                {classItem.subject?.name || 'Chưa phân môn'}
                {classItem.subject?.category ? ` · ${classItem.subject.category}` : ''}
              </p>
              <dl className="member-class-details">
                <div>
                  <dt><span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>Lịch học</dt>
                  <dd>{classSchedule(classItem)}</dd>
                </div>
                <div>
                  <dt><span className="material-symbols-outlined" aria-hidden="true">person</span>Huấn luyện viên</dt>
                  <dd>{classItem.coach?.fullName || classItem.coach?.username || 'Chưa phân công'}</dd>
                </div>
                <div>
                  <dt><span className="material-symbols-outlined" aria-hidden="true">location_on</span>Phòng</dt>
                  <dd>{classItem.room?.name || 'Chưa xếp phòng'}</dd>
                </div>
                <div>
                  <dt><span className="material-symbols-outlined" aria-hidden="true">groups</span>Sức chứa</dt>
                  <dd>{classItem.maxCapacity ?? 'Chưa cập nhật'} học viên</dd>
                </div>
              </dl>
              <div className="member-class-card-footer">
                <strong>
                  {classItem.price == null ? 'Liên hệ trung tâm' : priceFormatter.format(classItem.price)}
                </strong>
                <span>API đăng ký lớp chưa khả dụng</span>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="member-class-empty member-class-enrollment-note">
        <span className="member-class-empty-icon material-symbols-outlined" aria-hidden="true">info</span>
        <h3>Đăng ký lớp chưa được kết nối</h3>
        <p>
          Backend hiện chỉ hỗ trợ xem danh sách và thông tin lớp. Chưa có API đăng ký hoặc thanh toán,
          nên lớp trong danh sách này chưa được xem là lớp hội viên đã đăng ký.
        </p>
      </section>

      <aside className="member-policy-note">
        <span className="material-symbols-outlined" aria-hidden="true">verified_user</span>
        <div>
          <strong>Thời khóa biểu chỉ dành cho lớp đủ điều kiện</strong>
          <p>Chỉ lớp đã đăng ký thành công và thanh toán hợp lệ mới xuất hiện trong <Link to="/member/schedule">Lịch tập</Link>.</p>
        </div>
      </aside>
    </DashboardLayout>
  )
}
