import { useEffect, useState } from 'react'
import { getMemberPayment } from '../services/memberPaymentService'

export default function useMemberPayment(paymentId, enabled, pollingTimeout = 60000) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let timer
    let deadline
    const startedAt = Date.now()

    async function check() {
      try {
        const payment = await getMemberPayment(paymentId, { signal: controller.signal })
        if (controller.signal.aborted) return
        const timedOut = Date.now() - startedAt >= pollingTimeout
        setResult({ paymentId, attempt, payment, timedOut })
        if (payment.paymentStatus === 'Pending' && !timedOut) {
          timer = setTimeout(check, 3000)
        } else {
          clearTimeout(deadline)
        }
      } catch (error) {
        if (controller.signal.aborted) return
        clearTimeout(deadline)
        setResult({ paymentId, attempt, error })
      }
    }

    // Defer the first request so StrictMode cleanup cancels its first setup.
    timer = setTimeout(check, 0)
    deadline = setTimeout(() => {
      clearTimeout(timer)
      controller.abort()
      setResult((current) => ({ ...current, paymentId, attempt, timedOut: true }))
    }, pollingTimeout)

    return () => {
      clearTimeout(timer)
      clearTimeout(deadline)
      controller.abort()
    }
  }, [paymentId, enabled, attempt, pollingTimeout])

  const current = enabled && result?.paymentId === paymentId && result.attempt === attempt ? result : null
  return {
    payment: current?.payment,
    error: current?.error,
    timedOut: current?.timedOut,
    loading: enabled && !current,
    retry: () => setAttempt((value) => value + 1),
  }
}
