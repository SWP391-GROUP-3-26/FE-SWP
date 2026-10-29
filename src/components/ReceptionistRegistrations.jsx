import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useMemberRequest from '../hooks/useMemberRequest'
import { cancelReceptionistClass, getReceptionistRegistrations } from '../services/receptionistRegistrationService'
import { paymentApiErrorMessage } from '../services/memberPaymentService'
import { formatClassDate } from '../utils/classSchedule'
import Modal from './Modal'
import MemberRequestError from './MemberRequestError'
import RegisteredClassCard from './RegisteredClassCard'

export default function ReceptionistRegistrations({ member, onChanged }) {
  const request = useCallback((signal) => getReceptionistRegistrations(member.userId, { signal, status: 'ongoing' }), [member.userId])
  const { data, loading, error, retry } = useMemberRequest(request)
  const [target, setTarget] = useState(null)
  const [details, setDetails] = useState(null)
  const [busy, setBusy] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [message, setMessage] = useState('')
  const inFlight = useRef(false)
  async function confirm() {
    if (!target || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setCancelError('')
    try {
      const result = await cancelReceptionistClass(member.userId, target.bookingId)
      setMessage(result.message)
      setTarget(null)
      retry()
      onChanged(result.message)
    } catch (e) { setCancelError(paymentApiErrorMessage(e)) }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <section className="member-enrollments member-classes-page receptionist-registrations" aria-labelledby="member-active-classes-title">
    <div className="receptionist-registrations-heading">
      <div>
        <h3 id="member-active-classes-title">Lớp đang hoạt động</h3>
      </div>
      {data && !loading && !error && <span className="receptionist-class-count">{data.classes.length} lớp</span>}
    </div>
    {loading && <p role="status">Đang tải đăng ký…</p>}
    {error && <MemberRequestError error={error} retry={retry} />}
    {message && <p role="status">{message}</p>}
    {data && (data.classes.length ? <div className="member-class-table-wrap" role="region" aria-label="Danh sách lớp đang hoạt động" tabIndex={0}><table className="member-registrations-table" aria-label="Lớp đang hoạt động của hội viên">
      <thead><tr>{['Tên lớp', 'Mã lớp', 'Lịch tập', 'Khung giờ', 'Huấn luyện viên', 'Trạng thái', 'Thao tác'].map((text) => <th scope="col" key={text}>{text}</th>)}</tr></thead>
      <tbody>{data.classes.map((item) => <RegisteredClassCard key={item.registrationId ?? item.bookingId} item={item}
        paymentBasePath={`/receptionist/members/${member.userId}`} busy={busy}
        onDetail={setDetails} onCancel={(registration) => { setCancelError(''); setTarget(registration) }}
        onRebook={() => window.location.assign(`/receptionist/members/${member.userId}/classes`)} />)}</tbody>
    </table></div> : <div className="receptionist-classes-empty">
      <span className="material-symbols-outlined" aria-hidden="true">event_available</span>
      <strong>Chưa có lớp đang hoạt động</strong>
      <p className="member-muted">Đăng ký lớp phù hợp để hội viên bắt đầu tập luyện.</p>
      <Link className="member-row-action member-row-action-primary" to={`/receptionist/members/${member.userId}/classes`}>Đăng ký lớp</Link>
    </div>)}
    {target && <Modal title="Hủy đăng ký lớp" busy={busy} onClose={() => !busy && setTarget(null)}>
      <p>Hội viên: <strong>{member.fullName} · #{member.userId}</strong></p>
      <p>Lớp: <strong>{target.className}</strong></p>
      <p>Hủy các buổi tương lai của đăng ký này, trả lượt nếu dùng gói; giữ lịch sử các buổi đã học. Tiền đã thu cần đối soát, chưa tự động hoàn tiền.</p>
      {cancelError && <p role="alert">{cancelError}</p>}
      <div className="member-booking-actions">
        <button className="member-cancel-button" disabled={busy} onClick={() => setTarget(null)}>Đóng</button>
        <button className="member-register-button" disabled={busy} onClick={confirm}>{busy ? 'Đang hủy…' : 'Xác nhận hủy đăng ký lớp'}</button>
      </div>
    </Modal>}
    {details && <Modal title={details.className} onClose={() => setDetails(null)}>
      <p>{member.fullName} · #{member.userId} · {details.status}</p>
      <ul>{(details.sessions || []).map((s) => <li key={s.sessionId}>{formatClassDate(s.sessionDate)} · {s.sessionStartTime}–{s.sessionEndTime} · {s.rawStatus || s.sessionStatus}</li>)}</ul>
      <Link to={`/receptionist/members/${member.userId}/classes`}>Xem danh sách lớp</Link>
    </Modal>}
  </section>
}
