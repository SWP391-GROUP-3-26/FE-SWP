import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { saveAuth } from '../auth/authStorage'
import { getRouteForRole } from '../auth/roleConfig'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const registerMessage = location.state?.registered
    ? location.state?.message || 'Đăng ký tài khoản thành công.'
    : ''

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await axiosClient.post('/api/auth/login', {
        identifier,
        password,
      })
      const authData = response.data.data
      const accessToken = authData.accessToken
      const userId = authData.user.userId
      const role = authData.user.role
      const { fullName, email, username, status } = authData.user

      if (!accessToken || userId === undefined || !role) {
        setError('Phản hồi đăng nhập không đúng cấu trúc backend hiện tại.')
        return
      }

      saveAuth({ accessToken, userId, role, fullName, email, username, status })
      navigate(getRouteForRole(role), { replace: true })
    } catch (requestError) {
      const status = requestError?.response?.status
      const message = requestError?.response?.data?.message

      if (message) {
        setError(message)
      } else if (status === 401 || status === 403) {
        setError('Email, tên tài khoản hoặc mật khẩu không chính xác.')
      } else if (requestError?.request) {
        setError('Không thể kết nối đến backend. Vui lòng kiểm tra máy chủ hoặc cấu hình CORS.')
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="back-link">
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại trang chủ
        </Link>

        <div className="auth-heading">
          <span className="auth-logo material-symbols-outlined">spa</span>
          <small>UniSports FITNESS &amp; SPORTS</small>
          <h1>Đăng nhập</h1>
          <p>Chào mừng bạn quay trở lại với UniSports.</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          {registerMessage ? <div className="auth-notice">{registerMessage}</div> : null}

          <label>
            Email hoặc tên tài khoản
            <span className="input-wrap">
              <span className="material-symbols-outlined">badge</span>
              <input
                name="identifier"
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="email@example.com hoặc tên tài khoản"
                required
                type="text"
                value={identifier}
              />
            </span>
          </label>

          <label>
            Mật khẩu
            <span className="input-wrap">
              <span className="material-symbols-outlined">lock</span>
              <input
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu"
                required
                type="password"
                value={password}
              />
            </span>
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="submit-button" disabled={isLoading} type="submit">
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </section>
    </main>
  )
}
