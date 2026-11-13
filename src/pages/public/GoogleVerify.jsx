import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

const OTP_LENGTH = 6
const INITIAL_COUNTDOWN = 60

function maskEmail(email) {
  if (!email || !email.includes('@')) {
    return 'Email chưa được cung cấp'
  }

  const [name, domain] = email.split('@')
  if (!name || !domain) {
    return 'Email chưa được cung cấp'
  }

  const visibleName = name.length <= 2 ? name[0] : `${name[0]}${name[name.length - 1]}`
  const domainParts = domain.split('.')
  const domainName = domainParts[0] || ''
  const domainSuffix = domainParts.slice(1).join('.')
  const maskedDomain =
    domainName.length <= 1 ? '*' : `${domainName[0]}${'*'.repeat(Math.max(domainName.length - 1, 1))}`

  return `${visibleName}${'*'.repeat(Math.max(name.length - visibleName.length, 1))}@${maskedDomain}${
    domainSuffix ? `.${domainSuffix}` : ''
  }`
}

export default function GoogleVerify() {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const [countdown, setCountdown] = useState(INITIAL_COUNTDOWN)
  const [isLoading] = useState(false)
  const [error, setError] = useState('')
  const inputsRef = useRef([])
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const email = location.state?.email || searchParams.get('email') || ''
  const maskedEmail = maskEmail(email)
  const otpCode = otp.join('')
  const isSubmitDisabled = isLoading || otpCode.length < OTP_LENGTH

  useEffect(() => {
    if (countdown <= 0) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setCountdown((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [countdown])

  const updateOtpAt = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)

    setOtp((current) => {
      const next = [...current]
      next[index] = digit
      return next
    })
    setError('')

    if (digit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (event) => {
    event.preventDefault()
    const pastedCode = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH)

    if (!pastedCode) {
      return
    }

    const nextOtp = Array(OTP_LENGTH).fill('')
    pastedCode.split('').forEach((digit, index) => {
      nextOtp[index] = digit
    })
    setOtp(nextOtp)
    setError('')
    inputsRef.current[Math.min(pastedCode.length, OTP_LENGTH) - 1]?.focus()
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (otpCode.length < OTP_LENGTH) {
      setError('Vui lòng nhập đủ 6 số trong mã xác nhận.')
      return
    }

    setError('Backend chưa có verification endpoint để xác nhận mã Google.')
  }

  const handleResendCode = () => {
    if (countdown > 0) {
      return
    }

    setError('Backend chưa có resend endpoint để gửi lại mã xác nhận.')
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/login" className="back-link">
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại đăng nhập
        </Link>

        <div className="auth-heading">
          <span className="auth-logo material-symbols-outlined">verified_user</span>
          <small>SereneDesk Fitness & Sports</small>
          <h1>Xác nhận đăng nhập</h1>
          <p>Nhập mã xác nhận gồm 6 số được gửi đến email Google của bạn.</p>
        </div>

        <div className="masked-email">
          <span className="material-symbols-outlined">mail</span>
          <strong>{maskedEmail}</strong>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="otp-group" aria-label="Mã xác nhận gồm 6 số">
            {otp.map((digit, index) => (
              <input
                aria-label={`Số thứ ${index + 1}`}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                className="otp-input"
                inputMode="numeric"
                key={`otp-${index}`}
                maxLength={1}
                onChange={(event) => updateOtpAt(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onPaste={handlePaste}
                ref={(element) => {
                  inputsRef.current[index] = element
                }}
                type="text"
                value={digit}
              />
            ))}
          </div>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="submit-button" disabled={isSubmitDisabled} type="submit">
            {isLoading ? 'Đang xác nhận...' : 'Xác nhận'}
          </button>

          <button
            className="resend-button"
            disabled={countdown > 0 || isLoading}
            onClick={handleResendCode}
            type="button"
          >
            {countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Gửi lại mã'}
          </button>
        </form>

        <p className="auth-switch">
          Sai tài khoản? <Link to="/login">Quay lại Login</Link>
        </p>
      </section>
    </main>
  )
}
