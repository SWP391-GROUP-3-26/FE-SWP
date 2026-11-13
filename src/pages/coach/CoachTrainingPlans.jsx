import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import coachMenuItems from '../../layouts/coachMenuItems'
import TrainingPlanCards from '../../components/shared/TrainingPlanCards'
import { getCoachClasses } from '../../services/coachClassService'
import { getTrainingPlans, getTrainingPlan, getTrainingPlanMembers, saveTrainingPlan, trainingPlanError } from '../../services/trainingPlanService'

function MemberPicker({ classId, value, onChange, wholeClass }) {
  const [state, setState] = useState({ loading: true, students: [], error: '' })
  useEffect(() => {
    const controller = new AbortController()
    getTrainingPlanMembers(classId, controller.signal)
      .then((students) => { if (!controller.signal.aborted) setState({ loading: false, students, error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, students: [], error: trainingPlanError(error) }) })
    return () => controller.abort()
  }, [classId])
  if (wholeClass) return <div className="training-notice training-full" aria-live="polite">
    {state.loading ? <p>Đang tải danh sách người nhận...</p> : state.error ? <p role="alert">{state.error}</p> : <>
      <strong>{state.students.length} học viên đủ điều kiện nhận kế hoạch</strong>
      <p>{state.students.map((student) => student.memberName).join(', ') || 'Lớp chưa có học viên đang theo học.'}</p>
      <small>Danh sách được chốt khi giao. Học viên vào sau có thể được bổ sung từ chi tiết kế hoạch.</small>
    </>}
  </div>
  return <label>Học viên
    <select required value={value} disabled={state.loading || !!state.error} onChange={(event) => onChange(event.target.value)}>
      <option value="">{state.loading ? 'Đang tải học viên...' : 'Chọn học viên'}</option>
      {state.students.map((student) => <option key={student.memberId} value={student.memberId}>{student.memberName}</option>)}
    </select>
    {state.error && <span role="alert">{state.error}</span>}
    {!state.loading && !state.error && !state.students.length && <span>Lớp chưa có học viên đang theo học.</span>}
  </label>
}

function PlanEditor({ initial, classes, classId, memberId, scope }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => initial ? { ...initial, scope: initial.scope || 'INDIVIDUAL', publish: initial.status !== 'DRAFT' } : {
    scope: scope === 'CLASS' ? 'CLASS' : 'INDIVIDUAL', classId: classId || '', memberId: memberId || '', title: '', goal: '', assessment: '', startDate: '', endDate: '', version: 0,
    exercises: [{ name: '', instructions: '', target: '' }], publish: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selectedClass = classes.find((c) => String(c.classId) === String(form.classId))
  const activeClasses = classes.filter((c) => ['active', 'open'].includes(c.status?.toLowerCase()))
  function field(name, value) { setForm((previous) => ({ ...previous, [name]: value })) }
  function exerciseField(index, name, value) {
    setForm((previous) => ({ ...previous, exercises: previous.exercises.map((e, i) => i === index ? { ...e, [name]: value } : e) }))
  }
  async function save(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const plan = await saveTrainingPlan(initial?.id, {
        scope: form.scope, classId: Number(form.classId), memberId: form.scope === 'CLASS' ? null : Number(form.memberId), title: form.title, goal: form.goal,
        assessment: form.assessment, startDate: form.startDate, endDate: form.endDate, publish: form.publish, version: form.version,
        exercises: form.exercises.map(({ id, name, instructions, target }) => ({ id, name, instructions, target })),
      })
      navigate(`/coach/training-plans/${plan.id}`, { state: { message: form.publish ? 'Đã giao kế hoạch và gửi thông báo cho học viên.' : 'Đã lưu bản nháp.' } })
    } catch (err) { setError(trainingPlanError(err)) }
    finally { setBusy(false) }
  }
  return <form className="training-form" onSubmit={save}>
    <header className="training-section-header"><div><h2>{initial ? 'Chỉnh sửa kế hoạch' : 'Tạo kế hoạch tập luyện'}</h2></div><Link className="training-link" to="/coach/training-plans">Quay lại danh sách</Link></header>
    {error && <div className="training-error" role="alert">{error} {initial && <Link to={`/coach/training-plans/${initial.id}`}>Mở lại kế hoạch</Link>}</div>}
    <fieldset className="training-panel training-form-grid" disabled={busy || (initial && !initial.editable)}>
      <legend>Thông tin kế hoạch</legend>
      <label>Loại kế hoạch<select disabled={!!initial} value={form.scope} onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value, memberId: '' }))}>
        <option value="INDIVIDUAL">Cá nhân</option><option value="CLASS">Cả lớp</option>
      </select></label>
      <label>Lớp học<select required disabled={!!initial} value={form.classId} onChange={(event) => {
        setForm((p) => ({ ...p, classId: event.target.value, memberId: '' }))
      }}><option value="">Chọn lớp đang hoạt động</option>{(initial ? classes : activeClasses).map((c) => <option key={c.classId} value={c.classId}>{c.name}</option>)}</select></label>
      {initial && form.scope !== 'CLASS' ? <label>Học viên<input readOnly value={initial.memberName || ''} /></label>
        : form.scope === 'CLASS' && initial?.publishedRevision > 0 ? <p className="training-notice">Đã giao cho {initial.recipientCount} học viên. Bổ sung người nhận ở trang chi tiết.</p>
          : form.classId ? <MemberPicker key={form.classId} classId={form.classId} wholeClass={form.scope === 'CLASS'} value={form.memberId} onChange={(value) => field('memberId', value)} />
            : <p>Chọn lớp để xem danh sách học viên.</p>}
      <label className="training-full">Tên kế hoạch<input required maxLength={150} value={form.title} onChange={(e) => field('title', e.target.value)} /></label>
      <label>Ngày bắt đầu<input required type="date" min={selectedClass?.startDate || undefined} max={selectedClass?.endDate || undefined} value={form.startDate} onChange={(e) => field('startDate', e.target.value)} /></label>
      <label>Ngày kết thúc<input required type="date" min={form.startDate || selectedClass?.startDate || undefined} max={selectedClass?.endDate || undefined} value={form.endDate} onChange={(e) => field('endDate', e.target.value)} /></label>
      <label className="training-full">Mục tiêu<textarea required maxLength={2000} value={form.goal} onChange={(e) => field('goal', e.target.value)} /></label>
      <label className="training-full">Đánh giá ban đầu và lưu ý<textarea maxLength={2000} value={form.assessment || ''} onChange={(e) => field('assessment', e.target.value)} /></label>
    </fieldset>
    <div className="training-section-header"><h2>Nội dung tập luyện</h2><button type="button" disabled={busy || form.exercises.length >= 100 || (initial && !initial.editable)} onClick={() => field('exercises', [...form.exercises, { name: '', instructions: '', target: '' }])}>+ Thêm bài tập</button></div>
    {form.exercises.map((exercise, index) => <fieldset className="training-exercise" key={exercise.id || `new-${index}`} disabled={busy || (initial && !initial.editable)}>
      <legend>Bài tập {index + 1}</legend>
      <div className="training-form-grid">
        <label className="training-full">Tên bài tập<input required maxLength={150} value={exercise.name} onChange={(e) => exerciseField(index, 'name', e.target.value)} /></label>
        <label className="training-full">Khối lượng / mục tiêu bài tập<input required maxLength={255} placeholder="Ví dụ: 3 hiệp × 12 lần hoặc bơi 200m" value={exercise.target} onChange={(e) => exerciseField(index, 'target', e.target.value)} /></label>
        <label className="training-full">Hướng dẫn<textarea maxLength={2000} value={exercise.instructions || ''} onChange={(e) => exerciseField(index, 'instructions', e.target.value)} /></label>
      </div>
      {(exercise.hasResults || exercise.completed || exercise.memberResult) && <p className="training-notice">Đã có kết quả của học viên. Khi chỉnh sửa, kết quả vẫn được giữ lại.</p>}
      <div className="training-actions"><button type="button" disabled={form.exercises.length <= 1 || exercise.hasResults || exercise.completed || !!exercise.memberResult} onClick={() => field('exercises', form.exercises.filter((_, i) => i !== index))}>Xóa bài tập</button>
        <button type="button" disabled={index === 0} onClick={() => {
          const exercises = [...form.exercises]; [exercises[index - 1], exercises[index]] = [exercises[index], exercises[index - 1]]; field('exercises', exercises)
        }}>Đưa lên trước</button></div>
    </fieldset>)}
    {(!initial || initial.status === 'DRAFT') && <label className="training-checkbox"><input type="checkbox" disabled={busy} checked={form.publish} onChange={(e) => field('publish', e.target.checked)} />Giao ngay và thông báo cho học viên</label>}
    {initial && !initial.editable && <p className="training-notice">Kế hoạch hiện chỉ được xem lịch sử.</p>}
    <div className="training-actions"><Link className="training-link" to="/coach/training-plans">Hủy chỉnh sửa</Link><button className="training-primary" disabled={busy || !form.classId || (form.scope !== 'CLASS' && !form.memberId) || (initial && !initial.editable)} type="submit">{busy ? 'Đang lưu...' : form.publish ? 'Lưu và giao kế hoạch' : 'Lưu bản nháp'}</button></div>
  </form>
}

function CoachTrainingPlanContent() {
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const creating = params.has('new')
  const [state, setState] = useState({ loading: true, plans: [], classes: [], initial: null, error: '' })
  const [reload, setReload] = useState(0)
  const [classFilter, setClassFilter] = useState(params.get('classId') || '')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getCoachClasses({ signal: controller.signal }), getTrainingPlans('coach', controller.signal), editId ? getTrainingPlan('coach', editId, controller.signal) : Promise.resolve(null)])
      .then(([result, plans, initial]) => { if (!controller.signal.aborted) setState({ loading: false, plans, classes: result.classes, initial, error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, plans: [], classes: [], initial: null, error: trainingPlanError(error) }) })
    return () => controller.abort()
  }, [editId, reload])
  if (state.loading) return <p role="status">Đang tải kế hoạch...</p>
  if (state.error) return <div className="training-error" role="alert">{state.error} <button type="button" onClick={() => setReload((n) => n + 1)}>Thử lại</button></div>
  if (creating || editId) return <PlanEditor initial={state.initial} classes={state.classes} classId={params.get('classId')} memberId={params.get('memberId')} scope={params.get('scope')} />
  const plans = state.plans.filter((p) => (!classFilter || String(p.classId) === classFilter) && (!statusFilter || p.status === statusFilter)
    && `${p.title} ${p.memberName}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')))
  return <>
    <header className="training-section-header"><div><span className="section-heading-kicker">TRAINING PLANS</span><h2>Kế hoạch tập luyện</h2></div><Link className="training-button training-primary" to={`/coach/training-plans?new=1${classFilter ? `&classId=${classFilter}` : ''}`}>+ Tạo kế hoạch</Link></header>
    <div className="training-filters">
      <label>Lớp học<select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="">Tất cả lớp</option>{state.classes.map((c) => <option key={c.classId} value={c.classId}>{c.name}</option>)}</select></label>
      <label>Trạng thái<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="ASSIGNED">Đã giao</option><option value="COMPLETED">Hoàn thành</option><option value="CANCELLED">Đã hủy</option></select></label>
      <label>Tìm kế hoạch / học viên<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
    </div>
    {plans.length ? <TrainingPlanCards plans={plans} audience="coach" /> : <p className="training-empty">Chưa có kế hoạch phù hợp. Tạo kế hoạch để bắt đầu giao bài cho học viên.</p>}
  </>
}

export default function CoachTrainingPlans() {
  const [params] = useSearchParams()
  return <DashboardLayout role="Coach" roleLabel="Huấn luyện viên" menuItems={coachMenuItems} eyebrow="Huấn luyện viên / Kế hoạch tập" title="Kế hoạch tập luyện" showIntro={false}>
    <main className="training-page"><CoachTrainingPlanContent key={params.toString()} /></main>
  </DashboardLayout>
}
