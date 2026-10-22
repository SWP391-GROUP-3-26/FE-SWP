import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import coachMenuItems from '../components/coachMenuItems'
import {
  coachClassApiErrorMessage,
  getCoachClassDetail,
  getCoachClassSessions,
  getCoachSessionAttendance,
  saveCoachSessionAttendance,
} from '../services/coachClassService'
import './CoachClasses.css'
import './CoachClassDetail.css'

const ATTENDANCE_OPTIONS = [
  { value: 'Present', label: 'Có mặt', icon: 'check_circle' },
  { value: 'Absent', label: 'Vắng mặt', icon: 'cancel' },
  { value: 'Late', label: 'Đi trễ', icon: 'schedule' },
  { value: 'Excused', label: 'Có phép', icon: 'event_busy' },
]
const ATTENDANCE_LABELS = Object.fromEntries(ATTENDANCE_OPTIONS.map((option) => [option.value, option.label]))
const STATUS_LABELS = { Active: 'Đang diễn ra', Open: 'Đang mở đăng ký', Completed: 'Đã hoàn thành', Cancelled: 'Đã hủy', Cancel: 'Đã hủy' }
const CURRENCY = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })

function formatDate(value) {
  if (!value) return 'Chưa cập nhật'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : ''
}

function displayClassStatus(item) {
  return item?.statusDisplay || STATUS_LABELS[item?.status] || item?.status || 'Chưa cập nhật'
}

function sessionCanBeMarked(session) {
  if (!session || session.status?.toLowerCase() === 'cancelled') return false
  const today = new Date()
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  if (session.date < localToday) return true
  if (session.date > localToday) return false
  const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`
  return formatTime(session.startTime) <= currentTime
}

function makeDrafts(members = []) {
  return Object.fromEntries(members.map((member) => [member.memberId, {
    status: member.status || '',
    note: member.note || '',
  }]))
}

function attendanceCounts(members = []) {
  return members.reduce((counts, member) => {
    if (member.status && Object.hasOwn(counts, member.status)) counts[member.status] += 1
    return counts
  }, { Present: 0, Absent: 0, Late: 0, Excused: 0 })
}

export default function CoachClassDetail() {
  const { classId } = useParams()
  const [classDetail, setClassDetail] = useState(null)
  const [classLoading, setClassLoading] = useState(true)
  const [classError, setClassError] = useState('')
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [sessionData, setSessionData] = useState(null)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setClassLoading(true)
    setSessionsLoading(true)
    setClassError('')
    setSessionsError('')
    setClassDetail(null)
    setSessions([])
    setSelectedSessionId('')
    setSessionData(null)

    getCoachClassDetail(classId, controller.signal)
      .then((detail) => { if (!controller.signal.aborted) setClassDetail(detail) })
      .catch((error) => { if (!controller.signal.aborted) setClassError(coachClassApiErrorMessage(error)) })
      .finally(() => { if (!controller.signal.aborted) setClassLoading(false) })

    getCoachClassSessions(classId, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return
        setSessions(items)
        const today = new Date()
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const selectable = items.filter((session) => session.status?.toLowerCase() !== 'cancelled')
        const previousOrCurrent = selectable.filter((session) => session.date <= todayKey)
        const initial = previousOrCurrent.at(-1) || selectable[0] || items[0]
        setSelectedSessionId(initial?.sessionId?.toString() || '')
      })
      .catch((error) => { if (!controller.signal.aborted) setSessionsError(coachClassApiErrorMessage(error)) })
      .finally(() => { if (!controller.signal.aborted) setSessionsLoading(false) })

    return () => controller.abort()
  }, [classId, reloadKey])

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionData(null)
      setDrafts({})
      return undefined
    }
    const controller = new AbortController()
    setAttendanceLoading(true)
    setAttendanceError('')
    setSaveMessage('')
    setSessionData(null)
    getCoachSessionAttendance(classId, selectedSessionId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setSessionData(result)
        setDrafts(makeDrafts(result.members))
      })
      .catch((error) => { if (!controller.signal.aborted) setAttendanceError(coachClassApiErrorMessage(error)) })
      .finally(() => { if (!controller.signal.aborted) setAttendanceLoading(false) })
    return () => controller.abort()
  }, [classId, selectedSessionId])

  const selectedSession = sessions.find((session) => String(session.sessionId) === selectedSessionId)
  const members = sessionData?.members || []
  const counts = useMemo(() => attendanceCounts(members.map((member) => ({
    ...member,
    status: drafts[member.memberId]?.status || '',
  }))), [members, drafts])
  const completeRoster = members.length > 0 && members.every((member) => Boolean(drafts[member.memberId]?.status))
  const canMark = sessionCanBeMarked(selectedSession)
  const hasChanges = members.some((member) =>
    (drafts[member.memberId]?.status || '') !== (member.status || '') ||
    (drafts[member.memberId]?.note || '') !== (member.note || ''))

  function changeMember(memberId, field, value) {
    setSaveMessage('')
    setDrafts((current) => ({
      ...current,
      [memberId]: { ...current[memberId], [field]: value },
    }))
  }

  async function saveAttendance() {
    if (!selectedSessionId || !completeRoster || !canMark || saving) return
    setSaving(true)
    setAttendanceError('')
    setSaveMessage('')
    try {
      const records = members.map((member) => ({
        memberId: member.memberId,
        status: drafts[member.memberId].status,
        note: drafts[member.memberId].note.trim() || null,
      }))
      const saved = await saveCoachSessionAttendance(classId, selectedSessionId, records)
      setSessionData(saved)
      setDrafts(makeDrafts(saved.members))
      setSaveMessage('Đã lưu điểm danh cho buổi học.')
    } catch (error) {
      setAttendanceError(coachClassApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const classStatus = displayClassStatus(classDetail)

  return (
    <DashboardLayout
      eyebrow="Huấn luyện viên / Danh sách lớp / Chi tiết lớp"
      menuItems={coachMenuItems}
      role="Coach"
      roleLabel="Huấn luyện viên"
      showIntro={false}
      title="Chi tiết lớp học"
      className="coach-class-detail-page-shell"
    >
      <main className="coach-class-detail-page">
        <Link className="coach-class-back-link" to="/coach/classes">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Quay lại danh sách lớp
        </Link>

        {classLoading && <div className="coach-class-detail-message" role="status">Đang tải thông tin lớp...</div>}
        {classError && <div className="coach-class-detail-message is-error" role="alert">
          <span>{classError}</span><button type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button>
        </div>}

        {classDetail && <>
          <section className="coach-class-detail-hero">
            <div className="coach-class-detail-hero-copy">
              <span className="section-heading-kicker">{classDetail.classCode || `Lớp #${classDetail.classId}`}</span>
              <div className="coach-class-detail-title-row">
                <div><h2>{classDetail.name || 'Lớp học'}</h2><p>{classDetail.subjectName || 'Chưa phân môn'}{classDetail.subjectCategory ? ` · ${classDetail.subjectCategory}` : ''}</p></div>
                <span className={`coach-class-status status-${String(classDetail.status || '').toLowerCase()}`}>{classStatus}</span>
              </div>
            </div>
            <div className="coach-class-detail-hero-icon material-symbols-outlined" aria-hidden="true">groups</div>
          </section>

          <section className="coach-class-detail-facts-page" aria-label="Thông tin lớp học">
            <article><span className="material-symbols-outlined" aria-hidden="true">calendar_month</span><div><small>Lịch học</small><strong>{classDetail.schedule || 'Chưa cập nhật'}</strong></div></article>
            <article><span className="material-symbols-outlined" aria-hidden="true">schedule</span><div><small>Thời hạn lớp</small><strong>{formatDate(classDetail.startDate)} – {formatDate(classDetail.endDate)}</strong></div></article>
            <article><span className="material-symbols-outlined" aria-hidden="true">location_on</span><div><small>Phòng tập</small><strong>{classDetail.roomName || 'Chưa xếp phòng'}</strong></div></article>
            <article><span className="material-symbols-outlined" aria-hidden="true">groups</span><div><small>Sĩ số</small><strong>{classDetail.enrolledStudentsCount ?? classDetail.students?.length ?? 0} / {classDetail.maxCapacity ?? '—'}</strong></div></article>
            <article><span className="material-symbols-outlined" aria-hidden="true">payments</span><div><small>Học phí</small><strong>{CURRENCY.format(Number(classDetail.price || 0))}</strong></div></article>
          </section>

          <section className="coach-attendance-page-panel" aria-labelledby="coach-attendance-title">
            <header className="coach-attendance-page-header">
              <div><span className="section-heading-kicker">THEO DÕI BUỔI HỌC</span><h3 id="coach-attendance-title">Điểm danh học viên</h3>
                <p>Chọn buổi học, cập nhật tình trạng từng học viên rồi lưu điểm danh.</p></div>
              <label className="coach-attendance-session-picker">Buổi học
                <select value={selectedSessionId} onChange={(event) => {
                  if (hasChanges && !window.confirm('Bạn có thay đổi điểm danh chưa lưu. Chuyển buổi học và bỏ các thay đổi này?')) return
                  setSelectedSessionId(event.target.value)
                }} disabled={sessionsLoading || sessions.length === 0}>
                  {sessions.length === 0 && <option value="">Chưa có buổi học</option>}
                  {sessions.map((session) => <option key={session.sessionId} value={session.sessionId}>
                    {formatDate(session.date)} · {formatTime(session.startTime)}–{formatTime(session.endTime)}{session.status?.toLowerCase() === 'cancelled' ? ' · Đã hủy' : ''}
                  </option>)}
                </select>
              </label>
            </header>

            {sessionsLoading && <div className="coach-class-detail-message" role="status">Đang tải lịch buổi học...</div>}
            {sessionsError && <div className="coach-class-detail-message is-error" role="alert"><span>{sessionsError}</span>
              <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button></div>}
            {!sessionsLoading && !sessionsError && sessions.length === 0 && <p className="coach-class-no-students">Lớp chưa có buổi học để điểm danh.</p>}

            {selectedSession && <div className="coach-attendance-session-summary">
              <div><small>Ngày học</small><strong>{formatDate(selectedSession.date)}</strong></div>
              <div><small>Thời gian</small><strong>{formatTime(selectedSession.startTime)}–{formatTime(selectedSession.endTime)}</strong></div>
              <div><small>Học viên</small><strong>{sessionData?.session?.registeredMembers ?? selectedSession.registeredMembers ?? '—'}</strong></div>
              <div><small>Đã điểm danh</small><strong>{sessionData?.session?.markedMembers ?? selectedSession.markedMembers ?? 0}</strong></div>
            </div>}

            {!canMark && selectedSession?.status?.toLowerCase() === 'cancelled' && <p className="coach-attendance-page-notice">Buổi học đã hủy nên không thể cập nhật điểm danh.</p>}
            {!canMark && selectedSession?.status?.toLowerCase() !== 'cancelled' && selectedSession && <p className="coach-attendance-page-notice">Có thể điểm danh từ thời điểm bắt đầu buổi học.</p>}
            {attendanceError && <div className="coach-class-detail-message is-error" role="alert">{attendanceError}</div>}
            {saveMessage && <div className="coach-attendance-page-success" role="status"><span className="material-symbols-outlined" aria-hidden="true">check_circle</span>{saveMessage}</div>}
            {attendanceLoading && <div className="coach-class-detail-message" role="status">Đang tải danh sách học viên...</div>}

            {!attendanceLoading && sessionData && <>
              <div className="coach-attendance-counts" aria-label="Thống kê trạng thái điểm danh">
                {ATTENDANCE_OPTIONS.map((option) => <div className={`coach-attendance-count count-${option.value.toLowerCase()}`} key={option.value}>
                  <span className="material-symbols-outlined" aria-hidden="true">{option.icon}</span><small>{option.label}</small><strong>{counts[option.value]}</strong>
                </div>)}
              </div>
              {members.length === 0 ? <p className="coach-class-no-students">Buổi học này chưa có học viên đăng ký.</p> : (
                <div className="coach-attendance-member-list">
                  {members.map((member) => {
                    const draft = drafts[member.memberId] || { status: '', note: '' }
                    return <article className="coach-attendance-member-row" key={member.memberId}>
                      {member.avatarUrl ? <img className="coach-class-student-avatar" src={member.avatarUrl} alt="" />
                        : <span className="coach-class-student-avatar">{member.fullName?.trim()?.charAt(0)?.toUpperCase() || 'H'}</span>}
                      <div className="coach-attendance-member-copy"><strong>{member.fullName || 'Học viên'}</strong>
                        <small>{member.phone || member.username || 'Chưa có thông tin liên hệ'}</small>
                        {draft.status && <span className={`coach-attendance-current is-${draft.status.toLowerCase()}`}>{ATTENDANCE_LABELS[draft.status]}</span>}
                      </div>
                      <div className="coach-attendance-status-actions" role="group" aria-label={`Điểm danh ${member.fullName || 'học viên'}`}>
                        {ATTENDANCE_OPTIONS.map((option) => <button key={option.value} type="button" disabled={!canMark || saving}
                          className={`${draft.status === option.value ? 'is-selected' : ''} is-${option.value.toLowerCase()}`}
                          aria-pressed={draft.status === option.value}
                          onClick={() => changeMember(member.memberId, 'status', option.value)}>
                          <span className="material-symbols-outlined" aria-hidden="true">{option.icon}</span>{option.label}
                        </button>)}
                      </div>
                      <label className="coach-attendance-note">Ghi chú
                        <input value={draft.note} maxLength={255} disabled={!canMark || saving}
                          onChange={(event) => changeMember(member.memberId, 'note', event.target.value)} placeholder="Không bắt buộc" />
                      </label>
                    </article>
                  })}
                </div>
              )}
              {members.length > 0 && <footer className="coach-attendance-save-bar">
                <span>{completeRoster ? 'Đã chọn trạng thái cho tất cả học viên.' : 'Hãy chọn trạng thái cho từng học viên trước khi lưu.'}</span>
                <button type="button" disabled={!canMark || !completeRoster || !hasChanges || saving} onClick={() => void saveAttendance()}>
                  <span className="material-symbols-outlined" aria-hidden="true">save</span>{saving ? 'Đang lưu...' : 'Lưu điểm danh'}
                </button>
              </footer>}
            </>}
          </section>
        </>}
      </main>
    </DashboardLayout>
  )
}
