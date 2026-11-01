import { useEffect, useRef, useState } from 'react'
import { getMySessionEvaluation, sessionEvaluationError } from '../services/sessionEvaluationService'
import SessionEvaluationDetails from './SessionEvaluationDetails'

export default function MemberSessionEvaluation({ sessionId, onClose }) {
  const dialog = useRef(null)
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const node = dialog.current
    node.showModal()
    return () => node.close()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    getMySessionEvaluation(sessionId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ loading: false, data, error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, data: null, error: sessionEvaluationError(error) }) })
    return () => controller.abort()
  }, [sessionId, reload])
  return <dialog className="session-evaluation-dialog" ref={dialog} onClose={() => { if (!dialog.current?.open) onClose() }} aria-labelledby="member-session-evaluation-title">
    <header><div><h2 id="member-session-evaluation-title">Đánh giá buổi học</h2>{state.data && <p>{state.data.className}</p>}</div>
      <button type="button" autoFocus aria-label="Đóng đánh giá" onClick={() => dialog.current.close()}>×</button>
    </header>
    {state.loading && <p role="status">Đang tải đánh giá...</p>}
    {state.error && <div role="alert" className="session-evaluation-error">{state.error}<button type="button" onClick={() => {
      setState({ loading: true, data: null, error: '' }); setReload((value) => value + 1)
    }}>Thử lại</button></div>}
    {state.data && <SessionEvaluationDetails evaluation={state.data} />}
  </dialog>
}
