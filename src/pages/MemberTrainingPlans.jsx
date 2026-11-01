import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import memberMenuItems from '../components/memberMenuItems'
import TrainingPlanCards from '../components/TrainingPlanCards'
import { getTrainingPlans, trainingPlanError } from '../services/trainingPlanService'

export default function MemberTrainingPlans() {
  const [state, setState] = useState({ loading: true, plans: [], error: '' })
  const [reload, setReload] = useState(0)
  const [status, setStatus] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    getTrainingPlans('member', controller.signal)
      .then((plans) => { if (!controller.signal.aborted) setState({ loading: false, plans, error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, plans: [], error: trainingPlanError(error) }) })
    return () => controller.abort()
  }, [reload])
  const plans = state.plans.filter((plan) => !status || plan.status === status)
  return <DashboardLayout role="Hội viên" menuItems={memberMenuItems} eyebrow="Hội viên / Kế hoạch tập" title="Kế hoạch tập luyện" showIntro={false}>
    <main className="training-page"><header className="training-section-header"><div><h2>Kế hoạch dành cho bạn</h2><p>Xem bài tập, ghi nhận kết quả và đọc nhận xét của coach.</p></div>
      <label>Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả</option><option value="ASSIGNED">Đã giao</option><option value="COMPLETED">Hoàn thành</option><option value="CANCELLED">Đã hủy</option></select></label>
    </header>
      {state.loading && <p role="status">Đang tải kế hoạch...</p>}
      {state.error && <div className="training-error" role="alert">{state.error} <button type="button" onClick={() => setReload((n) => n + 1)}>Thử lại</button></div>}
      {!state.loading && !state.error && (plans.length ? <TrainingPlanCards plans={plans} /> : <p className="training-empty">Chưa có kế hoạch phù hợp.</p>)}
    </main>
  </DashboardLayout>
}
