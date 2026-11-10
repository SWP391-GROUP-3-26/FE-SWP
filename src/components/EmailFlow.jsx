import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useLanguage } from '../utils/language'
import './EmailFlow.css'

const routes = { register: 'register', login: 'email-verification', changed: 'email-verification/change-email', forgot: 'forgot-password' }

async function post(path, payload) {
  const response = await axiosClient.post('/api/auth/' + path, payload)
  return response.data?.data
}

export default function EmailFlow({ mode, initial, onBack, onDone }) {
  const language = useLanguage()
  const t = (vi, en) => language === 'en' ? en : vi
  const [purpose, setPurpose] = useState(mode)
  const [step, setStep] = useState(mode === 'forgot' ? 'email' : mode === 'login' ? 'request' : 'otp')
  const [challenge, setChallenge] = useState(initial)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [grant, setGrant] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(initial?.resendAfterSeconds || 0)
  useEffect(() => {
    if (!wait) return
    const timer = setTimeout(() => setWait(wait - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const titles = {
    email: t('Quên mật khẩu?', 'Forgot password?'),
    request: t('Xác thực email để đăng nhập', 'Verify your email to sign in'),
    change: t('Chọn email nhận mã', 'Choose a verification email'),
    otp: t('Kiểm tra hộp thư', 'Check your inbox'),
    password: t('Đặt mật khẩu mới', 'Set a new password'),
  }

  async function submit(action) {
    if (busy) return
    setError('')
    setBusy(true)
    const context = challenge && { email: challenge.email, verificationToken: challenge.verificationToken }
    try {
      if (action === 'email' || action === 'change') {
        const changing = action === 'change'
        const next = changing
          ? await post(routes.changed + '/request', { ...context, newEmail: email.trim() })
          : await post(routes.forgot, { email: email.trim() })
        if (!next?.email || !next.verificationToken) throw new Error()
        if (changing) setPurpose('changed')
        setChallenge(next)
        setWait(next.resendAfterSeconds ?? 60)
        setOtp('')
        setStep('otp')
      } else if (action === 'request' || action === 'resend') {
        await post(routes[purpose] + (purpose === 'login' ? '/request' : '/resend'), context)
        setOtp('')
        setWait(60)
        setStep('otp')
      } else if (action === 'otp') {
        const data = await post(routes[purpose] + '/verify', { ...context, otp })
        if (purpose === 'forgot') {
          if (!data?.resetToken) throw new Error()
          setGrant(data)
          setOtp('')
          setStep('password')
        } else onDone(data)
      } else if (action === 'password') {
        if (password !== confirmation) {
          setError(t('Mật khẩu nhập lại chưa khớp.', 'The passwords do not match.'))
          return
        }
        await post('reset-password', { email: context.email, resetToken: grant.resetToken, password, confirmPassword: confirmation })
        onDone()
      }
    } catch (err) {
      setError(err.response?.data?.message || t('Yêu cầu chưa thành công. Vui lòng thử lại.', 'Request failed. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const isEmail = step === 'email' || step === 'change'
  const sendLabel = t('Gửi mã xác thực', 'Send verification code')
  const backLabel = mode === 'register' ? t('Quay lại đăng ký', 'Back to sign up') : t('Quay lại đăng nhập', 'Back to sign in')
  return <>
    <button type="button" className="auth-text-action" disabled={busy} onClick={onBack}>← {backLabel}</button>
    <header className="auth-heading">
      <span aria-hidden="true" className="auth-logo material-symbols-outlined">{step === 'password' ? 'lock_reset' : 'mail'}</span>
      <h1>{titles[step]}</h1>
      {step === 'email' && <p>{t('Nhập email đã dùng để đăng ký UniSports.', 'Enter the email you used to sign up for UniSports.')}</p>}
      {step === 'request' && <p>{t('Nhận mã xác thực tại', 'Receive a verification code at')} <strong>{challenge.email}</strong></p>}
      {step === 'otp' && <p>{t('Nhập mã 6 chữ số đã gửi đến', 'Enter the six-digit code sent to')} <strong>{challenge.email}</strong>. {t('Mã có hiệu lực 5 phút.', 'The code is valid for 5 minutes.')}</p>}
    </header>
    <form className="auth-form email-flow" onSubmit={event => { event.preventDefault(); submit(step) }}>
      {isEmail && <label>Email<span className="input-wrap"><input autoComplete="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></span></label>}
      {step === 'otp' && <label>{t('Mã xác thực', 'Verification code')}<span className="input-wrap"><input className="otp-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} /></span></label>}
      {step === 'password' && <>
        <label>{t('Mật khẩu mới (8–72 ký tự)', 'New password (8–72 characters)')}<span className="input-wrap"><input required autoComplete="new-password" type="password" minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} /></span></label>
        <label>{t('Nhập lại mật khẩu mới', 'Confirm new password')}<span className="input-wrap"><input required autoComplete="new-password" type="password" maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></span></label>
      </>}
      {error && <div className="auth-error" role="alert">{error}</div>}
      <button className="submit-button" disabled={busy || (step === 'request' && wait > 0)}>{busy ? t('Đang xử lý…', 'Processing…') : step === 'otp' ? t('Xác nhận mã', 'Verify code') : step === 'password' ? t('Lưu mật khẩu mới', 'Save new password') : sendLabel}{step === 'request' && wait > 0 && ' (' + wait + 's)'}</button>
      {step === 'otp' && <button className="auth-text-action" type="button" disabled={busy || wait > 0} onClick={() => submit('resend')}>{t('Gửi lại mã', 'Resend code')}{wait > 0 && ' (' + wait + 's)'}</button>}
      {purpose === 'login' && step !== 'change' && <button type="button" className="auth-text-action" disabled={busy} onClick={() => { setError(''); setStep('change') }}>{t('Dùng địa chỉ email khác', 'Use another email address')}</button>}
    </form>
  </>
}
