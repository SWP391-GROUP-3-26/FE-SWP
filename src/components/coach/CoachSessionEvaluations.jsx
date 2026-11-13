import { useEffect, useState } from 'react'
import { getCoachSessionEvaluations, saveSessionEvaluation, withdrawSessionEvaluation, sessionEvaluationError } from '../../services/sessionEvaluationService'
import SessionEvaluationDetails from '../shared/SessionEvaluationDetails'
import { PROGRESS_LABELS } from '../../utils/sessionEvaluation'
import { formatClassDate } from '../../utils/classSchedule'

function EvaluationEditor({ student, busy, onSave, onDirty }) {
  const [form, setForm] = useState(() => ({ trainingContent: student.evaluation?.trainingContent || '',
    result: student.evaluation?.result || '', progressStatus: student.evaluation?.progressStatus || (student.history.length ? '' : 'INITIAL'),
    coachFeedback: student.evaluation?.coachFeedback || '', nextSteps: student.evaluation?.nextSteps || '', version: student.evaluation?.version ?? null }))
  function change(name, value) { setForm((previous) => ({ ...previous, [name]: value })); onDirty(true) }
  return <form className="session-evaluation-form" onSubmit={(event) => { event.preventDefault(); onSave(student.memberId, form) }}>
    <fieldset disabled={busy}>
      <label>Nội dung đã tập<textarea required maxLength={2000} value={form.trainingContent} onChange={(e) => change('trainingContent', e.target.value)} /></label>
      <label>Kết quả đạt được<textarea required maxLength={2000} placeholder="Số lần, quãng đường, thời gian hoặc kết quả thực hiện" value={form.result} onChange={(e) => change('result', e.target.value)} /></label>
      <label>Mức tiến độ<select required value={form.progressStatus} onChange={(e) => change('progressStatus', e.target.value)}>
        <option value="">Chọn mức tiến độ</option>{Object.entries(PROGRESS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Nhận xét của HLV<textarea required maxLength={2000} value={form.coachFeedback} onChange={(e) => change('coachFeedback', e.target.value)} /></label>
      <label>Hướng cải thiện / buổi tiếp theo<textarea maxLength={2000} value={form.nextSteps} onChange={(e) => change('nextSteps', e.target.value)} /></label>
      <button type="submit">{busy ? 'Đang lưu...' : 'Lưu kết quả & đánh giá'}</button>
    </fieldset>
  </form>
}

export default function CoachSessionEvaluations({ classId, sessionId, attendanceUnsaved, onDirtyChange }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])
  useEffect(() => {
    const controller = new AbortController()
    getCoachSessionEvaluations(classId, sessionId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ loading: false, data, error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, data: null, error: sessionEvaluationError(error) }) })
    return () => controller.abort()
  }, [classId, sessionId, reload])
  function changeDirty(value) { setDirty(value); onDirtyChange(value) }
  async function mutate(operation, success) {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      const data = await operation()
      setState({ loading: false, data, error: '' }); changeDirty(false); setMessage(success)
    } catch (error) { setState((previous) => ({ ...previous, error: sessionEvaluationError(error) })) }
    finally { setBusy(false) }
  }
  function open(memberId) {
    if (dirty && !window.confirm('Bỏ thay đổi đánh giá chưa lưu?')) return
    changeDirty(false); setSelected((current) => current === memberId ? null : memberId)
  }
  return <section className="session-evaluations" aria-labelledby="coach-session-evaluation-title">
    <header><h3 id="coach-session-evaluation-title">Kết quả & đánh giá sau buổi học</h3></header>
    {state.loading && <p role="status">Đang tải đánh giá...</p>}
    {state.error && <div className="session-evaluation-error" role="alert">{state.error}<button type="button" disabled={busy} onClick={() => {
      if (dirty && !window.confirm('Tải lại và bỏ thay đổi đánh giá chưa lưu?')) return
      changeDirty(false); setState({ loading: true, data: null, error: '' }); setReload((value) => value + 1)
    }}>Tải lại</button></div>}
    {message && <p className="session-evaluation-success" role="status">{message}</p>}
    {state.data && <>
      {!state.data.canEvaluate && <p className="session-evaluation-notice">Chỉ ghi nhận đánh giá sau khi buổi học kết thúc. Buổi hoặc lớp đã hủy chỉ được xem lịch sử.</p>}
      {attendanceUnsaved && <p className="session-evaluation-notice">Lưu điểm danh trước khi ghi kết quả và đánh giá.</p>}
      {!state.data.students.length && <p>Buổi học chưa có học viên đăng ký.</p>}
      <div className="session-evaluation-students">{state.data.students.map((student) => {
        const editable = state.data.canEvaluate && student.attendanceStatus === 'Present' && !attendanceUnsaved
        const evaluation = student.evaluation
        return <article className="session-evaluation-student" key={student.memberId}>
          <header><div><strong>{student.memberName}</strong><small>{student.attendanceStatus === 'Present' ? 'Có mặt' : student.attendanceStatus === 'Absent' ? 'Vắng mặt' : 'Chưa điểm danh'} · {evaluation ? evaluation.withdrawn ? 'Đã thu hồi đánh giá' : 'Đã đánh giá' : 'Chưa có đánh giá'}</small></div>
            <button type="button" disabled={busy} aria-expanded={selected === student.memberId} onClick={() => open(student.memberId)}>{selected === student.memberId ? 'Đóng' : editable ? 'Kết quả & đánh giá' : 'Xem chi tiết'}</button>
          </header>
          {selected === student.memberId && <>
            {student.history.length > 0 && <details className="session-evaluation-history"><summary>Đánh giá các buổi trước ({student.history.length})</summary>
              {student.history.map((old) => <details key={old.id}><summary>{formatClassDate(old.sessionDate)} · {PROGRESS_LABELS[old.progressStatus] || 'Đánh giá trước'}</summary><SessionEvaluationDetails evaluation={old} /></details>)}
            </details>}
            {editable ? <EvaluationEditor key={`${student.memberId}-${evaluation?.version ?? 'new'}-${evaluation?.withdrawn}`} student={student} busy={busy}
              onDirty={changeDirty} onSave={(memberId, data) => void mutate(() => saveSessionEvaluation(classId, sessionId, memberId, data), 'Đã lưu kết quả và đánh giá. Học viên có thể xem trên lịch tập.')} />
              : evaluation && !evaluation.withdrawn ? <SessionEvaluationDetails evaluation={evaluation} /> : <p className="session-evaluation-notice">{student.attendanceStatus !== 'Present' ? 'Chỉ học viên đã được điểm danh Có mặt mới được ghi kết quả tập luyện.' : 'Chưa có đánh giá cho buổi này.'}</p>}
            {evaluation && !evaluation.withdrawn && <button className="session-evaluation-withdraw" type="button" disabled={busy || attendanceUnsaved} onClick={() => {
              if (window.confirm('Thu hồi đánh giá này? Học viên sẽ không còn thấy đánh giá; dữ liệu vẫn được giữ để sửa lại.')) void mutate(() => withdrawSessionEvaluation(classId, sessionId, student.memberId, evaluation.version), 'Đã thu hồi đánh giá.')
            }}>Thu hồi đánh giá</button>}
          </>}
        </article>
      })}</div>
    </>}
  </section>
}
