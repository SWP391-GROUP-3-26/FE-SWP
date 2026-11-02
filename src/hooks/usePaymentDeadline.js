import { useEffect, useState } from 'react'

export default function usePaymentDeadline(expiresAt, enabled) {
  const [now, setNow] = useState(Date.now)
  const deadline = Date.parse(expiresAt)
  const remainingSeconds = Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0
  useEffect(() => {
    if (!enabled || !Number.isFinite(deadline)) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [deadline, enabled])
  return {
    expired: remainingSeconds === 0,
    remaining: `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`,
  }
}
