import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTrainingPlans, trainingPlanError } from '../../services/trainingPlanService'
import TrainingPlanCards from '../shared/TrainingPlanCards'
import LocalizedContent from '../common/LocalizedContent'
import { localDateKey } from '../../utils/trainingPlan'

export default function MemberTrainingPlanOverview() {
  const [state, setState] = useState({ loading: true, plans: [], error: '' })
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getTrainingPlans('member', controller.signal)
      .then((plans) => { if (!controller.signal.aborted) setState({ loading: false, plans, error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, plans: [], error: trainingPlanError(error) }) })
    return () => controller.abort()
  }, [reload])
  const today = localDateKey()
  const unread = state.plans.filter((plan) => plan.unread).length
  const visible = state.plans.filter((plan) => plan.unread || (plan.status === 'ASSIGNED' && plan.editable && plan.endDate >= today))
    .sort((a, b) => Number(b.unread) - Number(a.unread)).slice(0, 3)

  return <LocalizedContent><section className="training-overview" aria-labelledby="training-overview-title">
    <header className="training-section-header"><div><span className="section-heading-kicker">TỪ HUẤN LUYỆN VIÊN</span>
      <h2 id="training-overview-title">Kế hoạch tập luyện của bạn {unread > 0 && <span className="training-new">{unread} chưa đọc</span>}</h2>
      <p>{unread > 0 ? 'Coach đã giao hoặc cập nhật kế hoạch. Mở kế hoạch để xem nội dung mới.' : 'Theo dõi mục tiêu và bài tập coach dành cho bạn.'}</p>
    </div><Link className="training-link" to="/member/training-plans">Xem tất cả</Link></header>
    {state.loading && <p role="status">Đang tải kế hoạch tập luyện...</p>}
    {state.error && <div className="training-error" role="alert">{state.error} <button type="button" onClick={() => setReload((n) => n + 1)}>Thử lại</button></div>}
    {!state.loading && !state.error && (visible.length ? <LocalizedContent><TrainingPlanCards plans={visible} /></LocalizedContent>
      : <p className="training-empty">{state.plans.length ? 'Bạn chưa có kế hoạch đang áp dụng. Xem tất cả để xem lịch sử.' : 'Bạn chưa được giao kế hoạch tập luyện.'}</p>)}
  </section></LocalizedContent>
}
