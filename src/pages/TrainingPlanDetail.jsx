import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import coachMenuItems from '../components/coachMenuItems'
import memberMenuItems from '../components/memberMenuItems'
import { TrainingPlanStatus } from '../components/TrainingPlanCards'
import TrainingPlanRecipients from '../components/TrainingPlanRecipients'
import { trainingDate } from '../utils/trainingPlan'
import { getTrainingPlan, markTrainingPlanRead, reviewTrainingPlan, saveTrainingResult, addTrainingPlanRecipients, reviewTrainingPlanRecipient, trainingPlanError } from '../services/trainingPlanService'

function ExerciseResultForm({ exercise, disabled, onSave }) {
  const [completed, setCompleted] = useState(exercise.completed)
  const [result, setResult] = useState(exercise.memberResult || '')
  return <form className="training-review" onSubmit={(event) => { event.preventDefault(); onSave(exercise.id, { completed, memberResult: result }) }}>
    <label className="training-checkbox"><input type="checkbox" checked={completed} disabled={disabled} onChange={(e) => setCompleted(e.target.checked)} />Đã thực hiện bài tập</label>
    <label>Kết quả / phản hồi<textarea maxLength={2000} disabled={disabled} value={result} onChange={(e) => setResult(e.target.value)} placeholder="Ghi lại kết quả hoặc khó khăn khi tập" /></label>
    <div><button type="submit" disabled={disabled || (completed === exercise.completed && result === (exercise.memberResult || ''))}>Lưu kết quả</button></div>
  </form>
}

function DetailContent({ audience, id }) {
  const location = useLocation()
  const coach = audience === 'coach'
  const [state, setState] = useState({ loading: true, plan: null, error: '' })
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(location.state?.message || '')
  const [feedback, setFeedback] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    getTrainingPlan(audience, id, controller.signal)
      .then(async (plan) => {
        if (controller.signal.aborted) return
        let error = ''
        if (!coach && plan.unread) {
          try { plan = await markTrainingPlanRead(id, plan.publishedRevision, controller.signal) }
          catch (err) { error = `Không thể đánh dấu đã đọc: ${trainingPlanError(err)}` }
        }
        if (!controller.signal.aborted) {
          setState({ loading: false, plan, error })
          setFeedback(plan.coachFeedback || '')
        }
      })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, plan: null, error: trainingPlanError(error) }) })
    return () => controller.abort()
  }, [audience, coach, id, reload])

  async function mutate(operation, successMessage) {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const plan = await operation()
      setState({ loading: false, plan, error: '' })
      setFeedback(plan.coachFeedback || '')
      setMessage(successMessage)
    } catch (error) { setState((s) => ({ ...s, error: trainingPlanError(error) })) }
    finally { setBusy(false) }
  }
  const plan = state.plan
  return <>
    <Link className="training-link" to={`/${audience}/training-plans`}>← Danh sách kế hoạch</Link>
    {state.loading && <p role="status">Đang tải kế hoạch...</p>}
    {state.error && <div className="training-error" role="alert">{state.error} <button type="button" disabled={busy} onClick={() => setReload((n) => n + 1)}>Tải lại</button></div>}
    {message && <div className="training-success" role="status">{message}</div>}
    {plan && <>
      <section className="training-panel">
        <div className="training-section-header"><div><TrainingPlanStatus status={plan.status} /><span className="training-scope">{plan.scope === 'CLASS' ? 'Cả lớp' : 'Cá nhân'}</span><h2>{plan.title}</h2><p>{plan.className} · {plan.memberName} · Coach {plan.coachName}</p></div>
          {coach && plan.editable && <Link className="training-button" to={`/coach/training-plans?edit=${plan.id}`}>{plan.status === 'DRAFT' ? 'Chỉnh sửa / Giao kế hoạch' : 'Chỉnh sửa kế hoạch'}</Link>}
        </div>
        <p>{trainingDate(plan.startDate)} – {trainingDate(plan.endDate)}</p>
        <h3>Mục tiêu</h3><p>{plan.goal}</p>
        {plan.assessment && <><h3>Đánh giá ban đầu và lưu ý</h3><p>{plan.assessment}</p></>}
        <label className="training-progress">{plan.completedExercises}/{plan.totalExercises} {coach && plan.scope === 'CLASS' ? 'lượt bài' : 'bài'} đã thực hiện<progress value={plan.completedExercises} max={plan.totalExercises || 1} /></label>
        <small>Người tạo: {plan.createdByName}</small>
      </section>
      {!plan.editable && <p className="training-notice">Kế hoạch hiện chỉ được xem lịch sử; kết quả đã ghi nhận được giữ lại.</p>}
      {!coach && plan.editable && !plan.canRecord && <p className="training-notice">Bạn có thể ghi nhận kết quả trong thời gian áp dụng kế hoạch.</p>}
      <section className="training-panel"><h2>Nội dung tập luyện</h2>
        <div className="training-exercises">{plan.exercises.map((exercise, index) => <article className="training-exercise" key={exercise.id}>
          <div className="training-row"><h3>{index + 1}. {exercise.name}</h3></div>
          <p><strong>Khối lượng / mục tiêu:</strong> {exercise.target}</p>
          {exercise.instructions && <p>{exercise.instructions}</p>}
          {coach ? plan.scope !== 'CLASS' && <div className="training-notice"><strong>{exercise.completed ? 'Học viên đã thực hiện' : 'Chưa hoàn thành'}</strong><p>{exercise.memberResult || 'Chưa có phản hồi.'}</p></div>
            : <ExerciseResultForm exercise={exercise} disabled={!plan.canRecord || busy}
              onSave={(exerciseId, result) => void mutate(() => saveTrainingResult(plan.id, exerciseId, { ...result, version: plan.version }), 'Đã lưu kết quả tập luyện.')} />}
        </article>)}</div>
      </section>
      {coach && plan.scope === 'CLASS' && <TrainingPlanRecipients plan={plan} busy={busy}
        onAdd={() => void mutate(() => addTrainingPlanRecipients(plan.id, plan.version), 'Đã bổ sung học viên vào kế hoạch.')}
        onReview={(memberId, coachFeedback) => void mutate(() => reviewTrainingPlanRecipient(plan.id, memberId, { coachFeedback, version: plan.version }), 'Đã lưu nhận xét riêng cho học viên.')} />}
      {!coach && plan.scope === 'CLASS' && <section className="training-panel"><h2>Nhận xét dành riêng cho bạn</h2><p>{plan.personalFeedback || 'Coach chưa có nhận xét riêng.'}</p></section>}
      <section className="training-panel"><h2>{plan.scope === 'CLASS' ? 'Nhận xét chung của coach' : 'Nhận xét của coach'}</h2>
        {coach && plan.editable ? <form className="training-review" onSubmit={(e) => { e.preventDefault(); void mutate(() => reviewTrainingPlan(plan.id, { status: plan.status, coachFeedback: feedback, version: plan.version }), 'Đã lưu nhận xét.') }}>
          <label>Nhận xét<textarea maxLength={2000} value={feedback} disabled={busy} onChange={(e) => setFeedback(e.target.value)} /></label>
          <div className="training-actions">
            {plan.status === 'ASSIGNED' && <><button type="submit" disabled={busy}>Lưu nhận xét</button>
              <button type="button" className="training-primary" disabled={busy} onClick={() => void mutate(() => reviewTrainingPlan(plan.id, { status: 'COMPLETED', coachFeedback: feedback, version: plan.version }), 'Đã hoàn thành kế hoạch.')}>Hoàn thành kế hoạch</button></>}
            <button type="button" disabled={busy} onClick={() => {
              if (window.confirm('Hủy kế hoạch này? Kết quả đã ghi nhận vẫn được giữ lại.')) void mutate(() => reviewTrainingPlan(plan.id, { status: 'CANCELLED', coachFeedback: feedback, version: plan.version }), 'Đã hủy kế hoạch.')
            }}>Hủy kế hoạch</button>
          </div>
        </form> : <p>{plan.coachFeedback || 'Coach chưa có nhận xét.'}</p>}
      </section>
    </>}
  </>
}

export default function TrainingPlanDetail({ audience = 'member' }) {
  const { id } = useParams()
  const coach = audience === 'coach'
  return <DashboardLayout role={coach ? 'Coach' : 'Hội viên'} roleLabel={coach ? 'Huấn luyện viên' : 'Hội viên'} menuItems={coach ? coachMenuItems : memberMenuItems}
    eyebrow={`${coach ? 'Huấn luyện viên' : 'Hội viên'} / Kế hoạch tập / Chi tiết`} title="Chi tiết kế hoạch tập luyện" showIntro={false}>
    <main className="training-page"><DetailContent key={`${audience}-${id}`} audience={audience} id={id} /></main>
  </DashboardLayout>
}
