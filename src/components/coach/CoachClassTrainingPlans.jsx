import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTrainingPlans, trainingPlanError } from '../../services/trainingPlanService'
import { TrainingPlanStatus } from '../shared/TrainingPlanCards'

export default function CoachClassTrainingPlans({ detail }) {
  const [state, setState] = useState({ loading: true, plans: [], error: '' })
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getTrainingPlans('coach', controller.signal)
      .then((plans) => { if (!controller.signal.aborted) setState({ loading: false, plans: plans.filter((p) => p.classId === detail.classId), error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, plans: [], error: trainingPlanError(error) }) })
    return () => controller.abort()
  }, [detail.classId, reload])
  return <section className="training-panel" aria-labelledby="class-training-title">
    <header className="training-section-header"><div><h3 id="class-training-title">Kế hoạch tập luyện</h3></div>
      <Link className="training-link" to={`/coach/training-plans?classId=${detail.classId}`}>Xem kế hoạch của lớp</Link>
    </header>
    {state.loading && <p role="status">Đang tải trạng thái kế hoạch...</p>}
    {state.error && <div className="training-error" role="alert">{state.error} <button type="button" onClick={() => setReload((n) => n + 1)}>Thử lại</button></div>}
    {!state.loading && !state.error && <div className="training-class-plans">
      <h4>Kế hoạch chung của lớp</h4>
      {state.plans.filter((p) => p.scope === 'CLASS').map((plan) => <div className="training-row" key={plan.id}>
        <strong>{plan.title}</strong><TrainingPlanStatus status={plan.status} />
        <Link className="training-link" to={`/coach/training-plans/${plan.id}`}>Xem kế hoạch cả lớp</Link>
      </div>)}
      {['active', 'open'].includes(detail.status?.toLowerCase()) && !state.plans.some((p) => p.scope === 'CLASS' && ['DRAFT', 'ASSIGNED'].includes(p.status)) &&
        <Link className="training-button" to={`/coach/training-plans?new=1&scope=CLASS&classId=${detail.classId}`}>+ Tạo kế hoạch cả lớp</Link>}
    </div>}
  </section>
}
