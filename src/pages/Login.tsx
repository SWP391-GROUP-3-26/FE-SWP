import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      navigate('/dashboard')
    }, 900)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="back-link">
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lai trang chu
        </Link>

        <div className="auth-heading">
          <span className="auth-logo material-symbols-outlined">spa</span>
          <small>SereneDesk Fitness & Sports</small>
          <h1>Dang nhap</h1>
          <p>Chao mung ban quay tro lai voi SereneDesk.</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <label>
            Tai khoan
            <span className="input-wrap">
              <span className="material-symbols-outlined">badge</span>
              <input placeholder="Nhap ten tai khoan" required type="text" />
            </span>
          </label>

          <label>
            Mat khau
            <span className="input-wrap">
              <span className="material-symbols-outlined">lock</span>
              <input
                placeholder="Nhap mat khau"
                required
                type={showPassword ? 'text' : 'password'}
              />
            </span>
          </label>

          <label className="check-row">
            <input
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              type="checkbox"
            />
            Hien mat khau
          </label>

          <button className="submit-button" disabled={isLoading} type="submit">
            {isLoading ? 'Dang xac thuc...' : 'Dang nhap'}
          </button>
        </form>

        <p className="auth-switch">
          Chua co tai khoan? <Link to="/register">Dang ky</Link>
        </p>
      </section>
    </main>
  )
}
