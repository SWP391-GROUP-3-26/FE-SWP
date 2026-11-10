import { Link, useNavigate } from 'react-router-dom'
import RegistrationForm from '../components/RegistrationForm'
import { register } from '../services/registrationService'
import LocalizedContent from '../components/LocalizedContent'
import { useState } from 'react'
import EmailFlow from '../components/EmailFlow'

export default function Register() {
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState(null)
  const handleSuccess = () => {
    navigate('/login', { replace: true, state: { registered: true } })
  }
  return (
    <LocalizedContent><main className="auth-page">
      <section className="auth-card auth-card-wide">
        {challenge ? <EmailFlow mode="register" initial={challenge} onBack={() => setChallenge(null)} onDone={handleSuccess} /> : <>
        <Link to="/" className="back-link">
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại trang chủ
        </Link>

        <div className="auth-heading">
          <span className="auth-logo material-symbols-outlined">spa</span>
          <small>UniSports Fitness & Sports</small>
          <h1>Đăng ký tài khoản</h1>
          <p>Khởi đầu trải nghiệm tập luyện tại UniSports.</p>
        </div>

        <RegistrationForm submitRegistration={register} onSuccess={(_message, response) => {
          const pending = response.data?.data
          if (pending?.verificationToken && pending.email) setChallenge(pending)
          else if (response.status === 201) handleSuccess()
          else throw new Error('Missing registration verification context')
        }} />

        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
        </p>
        </>}
      </section>
    </main></LocalizedContent>
  )
}
