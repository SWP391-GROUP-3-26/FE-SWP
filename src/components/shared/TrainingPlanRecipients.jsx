import { useState } from 'react'

function Recipient({ recipient, editable, busy, onReview }) {
  const [feedback, setFeedback] = useState(recipient.coachFeedback || '')
  return <details className="training-recipient">
    <summary><strong>{recipient.memberName}</strong><span>{recipient.completedExercises}/{recipient.totalExercises} bài đã thực hiện</span>
      <span>{recipient.unread ? 'Chưa đọc' : 'Đã đọc'}{!recipient.enrolled ? ' · Chỉ xem lịch sử' : ''}</span>
    </summary>
    <div className="training-exercises">
      {recipient.exercises.map((exercise) => <article className="training-notice" key={exercise.id}>
        <strong>{exercise.name}</strong>
        <p>{exercise.completed ? 'Đã thực hiện' : 'Chưa hoàn thành'}</p><p>{exercise.memberResult || 'Chưa có phản hồi.'}</p>
      </article>)}
    </div>
    {editable ? <form className="training-review" onSubmit={(e) => { e.preventDefault(); onReview(recipient.memberId, feedback) }}>
      <label>Nhận xét cho {recipient.memberName}<textarea maxLength={2000} disabled={busy} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></label>
      <div><button type="submit" disabled={busy || feedback === (recipient.coachFeedback || '')}>Lưu nhận xét học viên</button></div>
    </form> : <p><strong>Nhận xét riêng:</strong> {recipient.coachFeedback || 'Chưa có nhận xét.'}</p>}
  </details>
}

export default function TrainingPlanRecipients({ plan, busy, onAdd, onReview }) {
  const candidates = plan.eligibleNewMembers || []
  return <section className="training-panel" aria-labelledby="training-recipients-title">
    <div className="training-section-header"><div><h2 id="training-recipients-title">Tiến độ từng học viên</h2>
      <p>{plan.recipientCount} học viên đã nhận. Mở từng người để xem kết quả và nhận xét riêng.</p></div>
    </div>
    {plan.editable && plan.status === 'ASSIGNED' && candidates.length > 0 && <div className="training-notice">
      <p>Học viên chưa nhận: {candidates.map((member) => member.memberName).join(', ')}</p>
      <button type="button" disabled={busy} onClick={onAdd}>Bổ sung {candidates.length} học viên</button>
    </div>}
    {!plan.recipientCount && <p className="training-empty">Danh sách người nhận sẽ được chốt khi giao kế hoạch.</p>}
    <div className="training-recipient-list">{(plan.recipients || []).map((recipient) =>
      <Recipient key={`${recipient.memberId}-${recipient.coachFeedback || ''}`} recipient={recipient}
        editable={plan.editable && plan.status === 'ASSIGNED'} busy={busy} onReview={onReview} />)}</div>
  </section>
}
