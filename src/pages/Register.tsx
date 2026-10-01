import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      navigate('/dashboard')
    }, 900)
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <Link to="/" className="back-link">
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lai trang chu
        </Link>

        <div className="auth-heading">
          <span className="auth-logo material-symbols-outlined">spa</span>
          <small>SereneDesk Fitness & Sports</small>
          <h1>Dang ky tai khoan</h1>
          <p>Khoi dau trai nghiem tap luyen tai SereneDesk.</p>
        </div>

        <form className="auth-form" onSubmit={handleRegister}>
          <div className="form-grid">
            <label>
              Tai khoan
              <span className="input-wrap">
                <span className="material-symbols-outlined">person_outline</span>
                <input placeholder="VD: minh_anh88" required type="text" />
              </span>
            </label>

            <label>
              Ho va ten
              <span className="input-wrap">
                <span className="material-symbols-outlined">badge</span>
                <input placeholder="VD: Nguyen Minh Anh" required type="text" />
              </span>
            </label>

            <label>
              Email
              <span className="input-wrap">
                <span className="material-symbols-outlined">mail</span>
                <input placeholder="minhanh@example.com" required type="email" />
              </span>
            </label>

            <label>
              So dien thoai
              <span className="input-wrap">
                <span className="material-symbols-outlined">call</span>
                <input placeholder="0912 345 678" required type="tel" />
              </span>
            </label>

            <label>
              Mat khau
              <span className="input-wrap">
                <span className="material-symbols-outlined">lock</span>
                <input
                  placeholder="Toi thieu 8 ky tu"
                  required
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  className="icon-button"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </span>
            </label>

            <label>
              Xac nhan mat khau
              <span className="input-wrap">
                <span className="material-symbols-outlined">lock_reset</span>
                <input
                  placeholder="Nhap lai mat khau"
                  required
                  type={showConfirmPassword ? 'text' : 'password'}
                />
                <button
                  className="icon-button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  type="button"
                >
                  <span className="material-symbols-outlined">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </span>
            </label>
          </div>

          <label className="check-row">
            <input required type="checkbox" />
            Toi dong y voi dieu khoan dich vu va chinh sach quyen rieng tu.
          </label>

          <button className="submit-button" disabled={isLoading} type="submit">
            {isLoading ? 'Dang tao tai khoan...' : 'Dang ky'}
          </button>
        </form>

        <p className="auth-switch">
          Da co tai khoan? <Link to="/login">Dang nhap ngay</Link>
        </p>
      </section>
    </main>
  )
}
