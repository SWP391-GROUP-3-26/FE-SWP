import { formatClassDate } from '../../utils/classSchedule'
import { PROGRESS_LABELS } from '../../utils/sessionEvaluation'
import '../../styles/SessionEvaluations.css'

export default function SessionEvaluationDetails({ evaluation }) {
  return <div className="session-evaluation-details">
    <p>{formatClassDate(evaluation.sessionDate)} · {evaluation.startTime?.slice(0, 5)}–{evaluation.endTime?.slice(0, 5)} · HLV {evaluation.coachName}</p>
    <dl>
      <dt>Nội dung đã tập</dt><dd>{evaluation.trainingContent || 'Chưa cập nhật'}</dd>
      <dt>Kết quả đạt được</dt><dd>{evaluation.result || 'Chưa cập nhật'}</dd>
      <dt>Tiến độ</dt><dd>{PROGRESS_LABELS[evaluation.progressStatus] || 'Chưa cập nhật'}</dd>
      <dt>Nhận xét của HLV</dt><dd>{evaluation.coachFeedback || 'Chưa có nhận xét'}</dd>
      {evaluation.nextSteps && <><dt>Hướng cải thiện / buổi tiếp theo</dt><dd>{evaluation.nextSteps}</dd></>}
    </dl>
    {evaluation.updatedAt && <small>Cập nhật: {new Date(evaluation.updatedAt).toLocaleString('vi-VN')}</small>}
  </div>
}
