import { useEffect, useState } from 'react'

// Tag results with the request so an old response is never shown for new input.
export default function useMemberRequest(request, enabled = true, delay = 0) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const data = await request(controller.signal)
        if (!controller.signal.aborted) setResult({ request, attempt, data })
      } catch (error) {
        if (!controller.signal.aborted) setResult({ request, attempt, error })
      }
    }, delay)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [request, enabled, delay, attempt])

  const current = enabled && result?.request === request && result.attempt === attempt ? result : null
  return {
    data: current?.data, error: current?.error, loading: enabled && !current,
    retry: () => setAttempt((value) => value + 1),
  }
}
