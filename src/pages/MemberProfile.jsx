import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { updateAuthProfile } from '../auth/authStorage'
import memberMenuItems from '../components/memberMenuItems'
import { getMyMemberPackageSubscriptions, memberPackageApiErrorMessage } from '../services/memberPackageService'
import {
  getMyProfile,
  profileErrorMessage,
  resolveAvatarUrl,
  updateMyProfile,
  uploadAvatar,
} from '../services/memberProfileService'
import './MemberProfile.css'

function emptyProfile() {
  return {
    fullName: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    avatarUrl: '',
  }
}

function toEditableProfile(profile) {
  return {
    fullName: profile.fullName || '',
    phone: profile.phone || '',
    dob: profile.dob || '',
    gender: profile.gender || '',
    address: profile.address || '',
    avatarUrl: profile.avatarUrl || '',
  }
}

function statusLabel(status) {
  if (status === 'Active') return 'Đang hoạt động'
  if (status === 'Inactive') return 'Ngừng hoạt động'
  if (status === 'Locked') return 'Đã khóa'
  return status || 'Chưa cập nhật'
}

function currentDate() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isActiveSubscription(subscription) {
  const today = currentDate()
  return subscription.subscriptionStatus?.toLowerCase() === 'active'
    && subscription.startDate <= today
    && subscription.endDate >= today
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).slice(0, 10))
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function dateOrdinal(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').slice(0, 10))
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000 : null
}

function packageTimeline(subscription) {
  const purchaseDate = subscription.paymentDate?.slice(0, 10) || subscription.startDate
  const purchaseDay = dateOrdinal(purchaseDate)
  const expiryDay = dateOrdinal(subscription.endDate)
  const todayDay = dateOrdinal(currentDate())
  const totalDays = purchaseDay != null && expiryDay != null ? Math.max(1, expiryDay - purchaseDay + 1) : 1
  const elapsedDays = purchaseDay != null && todayDay != null ? todayDay - purchaseDay : 0
  return {
    purchaseDate,
    progress: Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100))),
    remainingDays: expiryDay != null && todayDay != null ? Math.max(0, expiryDay - todayDay + 1) : null,
  }
}

export default function MemberProfile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [failedAvatarSrc, setFailedAvatarSrc] = useState('')
  const [activePackage, setActivePackage] = useState(null)
  const [packageLoading, setPackageLoading] = useState(true)
  const [packageError, setPackageError] = useState('')
  const [packageReloadKey, setPackageReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getMyProfile(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        updateAuthProfile({
          fullName: data.fullName,
          email: data.email,
          status: data.status,
          avatarUrl: data.avatarUrl,
        })
        setProfile(data)
        setForm(toEditableProfile(data))
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(profileErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [reloadKey])

  useEffect(() => {
    const controller = new AbortController()
    setPackageLoading(true)
    setPackageError('')
    getMyMemberPackageSubscriptions({ page: 0, size: 100, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        setActivePackage(result.data.find(isActiveSubscription) || null)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setPackageError(memberPackageApiErrorMessage(error))
      })
      .finally(() => { if (!controller.signal.aborted) setPackageLoading(false) })

    return () => controller.abort()
  }, [packageReloadKey])

  const isDirty = useMemo(() => {
    if (!profile) return false
    const original = toEditableProfile(profile)
    return Object.keys(original).some((key) => original[key] !== form[key])
  }, [form, profile])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setSaveError('')
    setNotice('')
  }

  function retryLoading() {
    setLoading(true)
    setLoadError('')
    setReloadKey((key) => key + 1)
  }

  function retryPackageLoading() {
    setPackageLoading(true)
    setPackageError('')
    setPackageReloadKey((key) => key + 1)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isDirty || saving) return

    setSaving(true)
    setSaveError('')
    setNotice('')
    try {
      const updated = await updateMyProfile({
        ...form,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        avatarUrl: form.avatarUrl.trim(),
      })
      updateAuthProfile({
        fullName: updated.fullName,
        email: updated.email,
        status: updated.status,
        avatarUrl: updated.avatarUrl,
      })
      setProfile(updated)
      setForm(toEditableProfile(updated))
      setNotice('Hồ sơ của bạn đã được cập nhật.')
    } catch (error) {
      setSaveError(profileErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file || avatarUploading) return

    setAvatarUploading(true)
    setSaveError('')
    setNotice('')
    try {
      const uploadedAvatarUrl = await uploadAvatar(file)
      updateAuthProfile({ avatarUrl: uploadedAvatarUrl })
      setProfile((current) => current ? { ...current, avatarUrl: uploadedAvatarUrl } : current)
      setForm((current) => ({ ...current, avatarUrl: uploadedAvatarUrl }))

      try {
        const updated = await getMyProfile()
        updateAuthProfile({
          fullName: updated.fullName,
          email: updated.email,
          status: updated.status,
          avatarUrl: updated.avatarUrl,
        })
        setProfile(updated)
        setForm(toEditableProfile(updated))
        setNotice('Ảnh đại diện đã được cập nhật.')
      } catch (refreshError) {
        setSaveError(`Ảnh đã tải lên nhưng không thể làm mới hồ sơ: ${profileErrorMessage(refreshError)}`)
      }
    } catch (error) {
      setSaveError(profileErrorMessage(error))
    } finally {
      setAvatarUploading(false)
    }
  }

  function cancelChanges() {
    if (profile) setForm(toEditableProfile(profile))
    setSaveError('')
    setNotice('')
  }

  const displayName = profile?.fullName || profile?.username || 'Hội viên'
  const avatarSrc = resolveAvatarUrl(form.avatarUrl)
  const showAvatar = avatarSrc && avatarSrc !== failedAvatarSrc
  const timeline = activePackage ? packageTimeline(activePackage) : null

  return (
    <DashboardLayout
      eyebrow="Hội viên / Tài khoản"
      menuItems={memberMenuItems}
      role="Hội viên"
      profile={profile}
      showIntro={false}
      title="Hồ sơ cá nhân"
    >
      {loading && (
        <div className="member-profile-state" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">progress_activity</span>
          Đang tải hồ sơ...
        </div>
      )}

      {!loading && loadError && (
        <section className="member-profile-state member-profile-error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={retryLoading}>Thử lại</button>
        </section>
      )}

      {!loading && !loadError && profile && (
        <>
          <section className="member-profile-card" aria-label="Thông tin hồ sơ hội viên">
            <div className="member-profile-cover" />
            <div className="member-profile-identity">
              <div className="member-profile-avatar-wrap">
                <div className="member-profile-avatar">
                  {showAvatar ? (
                    <img
                      key={avatarSrc}
                      src={avatarSrc}
                      alt={`Ảnh đại diện của ${displayName}`}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedAvatarSrc(avatarSrc)}
                    />
                  ) : (
                    <span className="material-symbols-outlined" aria-hidden="true">person</span>
                  )}
                </div>
                <label className={`member-avatar-upload${avatarUploading ? ' member-avatar-uploading' : ''}`}>
                  <input
                    accept="image/png,image/jpeg,image/gif"
                    aria-label="Tải ảnh đại diện lên"
                    disabled={avatarUploading}
                    onChange={handleAvatarUpload}
                    type="file"
                  />
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {avatarUploading ? 'progress_activity' : 'photo_camera'}
                  </span>
                  <span>{avatarUploading ? 'Đang tải ảnh...' : 'Đổi ảnh'}</span>
                </label>
              </div>
              <div className="member-profile-name">
                <h2>{displayName}</h2>
                <span className={`member-status${profile.status === 'Active' ? ' member-status-active' : ''}`}>
                  <span className="material-symbols-outlined" aria-hidden="true">fiber_manual_record</span>
                  {statusLabel(profile.status)}
                </span>
              </div>
            </div>

            <form className="member-profile-form" onSubmit={handleSubmit}>
              <div className="member-profile-section-heading">
                <h3><span className="material-symbols-outlined" aria-hidden="true">badge</span> Thông tin chi tiết</h3>
                <span>Mã tài khoản: {profile.userId ?? '—'}</span>
              </div>

              {saveError && <div className="member-profile-message member-profile-error" role="alert">{saveError}</div>}
              {notice && <div className="member-profile-message member-profile-success" role="status">{notice}</div>}

              <div className="member-profile-fields">
                <label className="member-profile-field">
                  <span>Họ và tên <b aria-hidden="true">*</b></span>
                  <div className="member-profile-input">
                    <span className="material-symbols-outlined" aria-hidden="true">person</span>
                    <input
                      autoComplete="name"
                      maxLength={100}
                      name="fullName"
                      onChange={updateField}
                      required
                      value={form.fullName}
                    />
                  </div>
                </label>

                <label className="member-profile-field">
                  <span>Tên đăng nhập</span>
                  <div className="member-profile-input member-profile-readonly">
                    <span className="material-symbols-outlined" aria-hidden="true">account_circle</span>
                    <input readOnly value={profile.username || '—'} />
                    <span className="material-symbols-outlined member-profile-lock" aria-label="Không thể chỉnh sửa">lock</span>
                  </div>
                </label>

                <label className="member-profile-field">
                  <span>Số điện thoại</span>
                  <div className="member-profile-input">
                    <span className="material-symbols-outlined" aria-hidden="true">call</span>
                    <input
                      autoComplete="tel"
                      maxLength={15}
                      name="phone"
                      onChange={updateField}
                      type="tel"
                      value={form.phone}
                    />
                  </div>
                </label>

                <label className="member-profile-field">
                  <span>Địa chỉ email</span>
                  <div className="member-profile-input member-profile-readonly">
                    <span className="material-symbols-outlined" aria-hidden="true">mail</span>
                    <input readOnly type="email" value={profile.email || '—'} />
                    <span className="material-symbols-outlined member-profile-lock" aria-label="Không thể chỉnh sửa">lock</span>
                  </div>
                </label>

                <label className="member-profile-field">
                  <span>Ngày sinh</span>
                  <div className="member-profile-input">
                    <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
                    <input name="dob" onChange={updateField} type="date" value={form.dob} />
                  </div>
                </label>

                <label className="member-profile-field">
                  <span>Giới tính</span>
                  <div className="member-profile-input">
                    <span className="material-symbols-outlined" aria-hidden="true">wc</span>
                    <select name="gender" onChange={updateField} value={form.gender}>
                      <option value="">Chưa cập nhật</option>
                      <option value="Male">Nam</option>
                      <option value="Female">Nữ</option>
                      <option value="Other">Khác</option>
                    </select>
                  </div>
                </label>

                <label className="member-profile-field member-profile-field-wide">
                  <span>Địa chỉ</span>
                  <div className="member-profile-input">
                    <span className="material-symbols-outlined" aria-hidden="true">location_on</span>
                    <input
                      autoComplete="street-address"
                      maxLength={255}
                      name="address"
                      onChange={updateField}
                      value={form.address}
                    />
                  </div>
                </label>

              </div>

              <div className="member-profile-actions">
                {isDirty && (
                  <button className="member-profile-button member-profile-secondary" onClick={cancelChanges} type="button">
                    Hủy thay đổi
                  </button>
                )}
                <button className="member-profile-button member-profile-primary" disabled={!isDirty || saving} type="submit">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {saving ? 'progress_activity' : 'task_alt'}
                  </span>
                  {saving ? 'Đang lưu...' : 'Cập nhật hồ sơ'}
                </button>
              </div>
            </form>
          </section>

          <section className="member-account-grid" aria-label="Thông tin tài khoản và hội viên">
            <article className="member-account-panel">
              <h3><span className="material-symbols-outlined" aria-hidden="true">verified_user</span> Tài khoản</h3>
              <dl>
                <div><dt>Vai trò</dt><dd>{profile.role || 'Hội viên'}</dd></div>
                <div><dt>Trạng thái</dt><dd>{statusLabel(profile.status)}</dd></div>
                <div><dt>Email đăng nhập</dt><dd>{profile.email || 'Chưa cập nhật'}</dd></div>
              </dl>
            </article>
            <article className="member-account-panel">
              <h3><span className="material-symbols-outlined" aria-hidden="true">card_membership</span> Gói tập &amp; thời hạn</h3>
              {packageLoading ? <p role="status">Đang tải gói tập...</p> : packageError ? (
                <div className="member-profile-package-error" role="alert">
                  <p>{packageError}</p><button type="button" onClick={retryPackageLoading}>Thử lại</button>
                </div>
              ) : activePackage && timeline ? (
                <div className="member-profile-package">
                  <div className="member-profile-package-heading">
                    <div><small>GÓI ĐANG SỬ DỤNG</small><strong>{activePackage.packageName || 'Gói hội viên'}</strong></div>
                    <span className="member-profile-package-status">Đang hoạt động</span>
                  </div>
                  <div className="member-profile-package-dates">
                    <div><small>Ngày mua</small><strong>{formatDate(timeline.purchaseDate)}</strong></div>
                    <span className="material-symbols-outlined" aria-hidden="true">trending_flat</span>
                    <div><small>Ngày hết hạn</small><strong>{formatDate(activePackage.endDate)}</strong></div>
                  </div>
                  <div className="member-profile-package-progress" role="progressbar" aria-label="Thời hạn gói tập đã sử dụng"
                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={timeline.progress}>
                    <span style={{ width: `${timeline.progress}%` }} />
                  </div>
                  <div className="member-profile-package-progress-label">
                    <span>{timeline.progress}% thời hạn đã sử dụng</span>
                    {timeline.remainingDays != null && <strong>Còn {timeline.remainingDays} ngày</strong>}
                  </div>
                </div>
              ) : (
                <div className="member-profile-package-empty">
                  <p>Bạn hiện chưa có gói tập đang hoạt động.</p>
                  <Link to="/member/packages">Xem các gói tập</Link>
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </DashboardLayout>
  )
}
