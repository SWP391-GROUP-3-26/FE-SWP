import { Link } from 'react-router-dom'
import { trainingDate } from '../utils/trainingPlan'
import './TrainingPlans.css'
import LocalizedContent from './LocalizedContent'

const labels = { DRAFT: 'Bản nháp', ASSIGNED: 'Đã giao', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' }

export function TrainingPlanStatus({ status }) {
  return <span className={`training-status training-status-${status?.toLowerCase()}`}><LocalizedContent>{labels[status] || status}</LocalizedContent></span>
}

export default function TrainingPlanCards({ plans, audience = 'member' }) {
  return <LocalizedContent><div className="training-card-grid">
    {plans.map((plan) => <article className="training-card" key={plan.id}>
      <div className="training-row"><TrainingPlanStatus status={plan.status} />
        <span className="training-scope">{plan.scope === 'CLASS' ? 'Cả lớp' : 'Cá nhân'}</span>
        {audience === 'member' && plan.unread && <span className="training-new">{plan.publishedRevision > 1 ? 'Cập nhật mới' : 'Mới'}</span>}
      </div>
      <h3>{plan.title}</h3>
      <p>{plan.className} · {audience === 'coach' ? plan.memberName : `Coach ${plan.coachName}`}</p>
      {audience === 'coach' && plan.scope === 'CLASS' && <p>{plan.recipientCount} học viên đã nhận</p>}
      <p>{trainingDate(plan.startDate)} – {trainingDate(plan.endDate)}</p>
      <p className="training-goal">{plan.goal}</p>
      <label className="training-progress">{plan.completedExercises}/{plan.totalExercises} {audience === 'coach' && plan.scope === 'CLASS' ? 'lượt bài' : 'bài'} đã thực hiện
        <progress value={plan.completedExercises} max={plan.totalExercises || 1} />
      </label>
      <Link className="training-link" to={`/${audience}/training-plans/${plan.id}`}>Xem kế hoạch <span aria-hidden="true">→</span></Link>
    </article>)}
  </div></LocalizedContent>
}
