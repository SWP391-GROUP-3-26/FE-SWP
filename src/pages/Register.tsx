import { Link, useNavigate } from 'react-router-dom'
import RegistrationForm from '../components/RegistrationForm'
import { register } from '../services/registrationService'

export default function Register() {
  const navigate = useNavigate()
  const handleSuccess = (message) => {
    navigate('/login', { replace: true, state: { registered: true, message } })
  }
  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
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

        <RegistrationForm submitRegistration={register} onSuccess={handleSuccess} />

        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
        </p>
      </section>
    </main>
  )
}
