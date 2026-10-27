import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import axiosClient, { GOOGLE_AUTH_URL } from '../api/axiosClient'
import { saveAuth } from '../auth/authStorage'
import { getRouteForRole } from '../auth/roleConfig'

export default function Login() {
  const [searchParams] = useSearchParams()
  const errorParam = searchParams.get('error')

  const getInitialGoogleError = () => {
    if (!errorParam) return ''
    if (errorParam === 'google_email_not_verified') {
      return 'Tài khoản Google của bạn chưa được xác thực email.'
    }
    if (errorParam === 'google_authentication_failed') {
      return 'Đăng nhập Google thất bại hoặc bạn đã hủy ủy quyền.'
    }
    if (errorParam === 'google_login_failed') {
      return 'Đăng nhập bằng tài khoản Google không thành công. Vui lòng thử lại.'
    }
    return 'Đã xảy ra lỗi khi đăng nhập bằng Google. Vui lòng thử lại.'
  }

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(getInitialGoogleError)
  const location = useLocation()
  const navigate = useNavigate()
  const registerMessage = location.state?.registered
    ? 'Tài khoản đã được tạo thành công. Vui lòng đăng nhập để tiếp tục.'
    : ''

  const handleGoogleLogin = () => {
    setIsLoading(true)
    window.location.href = GOOGLE_AUTH_URL
  }

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
      const { fullName, email, username, status, avatarUrl } = authData.user

      if (!accessToken || userId === undefined || !role) {
        setError('Phản hồi đăng nhập không đúng cấu trúc backend hiện tại.')
        return
      }

      saveAuth({ accessToken, userId, role, fullName, email, username, status, avatarUrl })
      navigate(getRouteForRole(role), { replace: true })
    } catch (requestError) {
      const status = requestError?.response?.status
      if (status === 401) {
        setError('Email, tên tài khoản hoặc mật khẩu không chính xác.')
      } else if (status === 403) {
        setError('Tài khoản hiện không được phép đăng nhập. Vui lòng liên hệ trung tâm để được hỗ trợ.')
      } else if (status === 400) {
        setError('Thông tin đăng nhập chưa hợp lệ. Vui lòng kiểm tra lại.')
      } else if (requestError?.request) {
        setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="auth-page auth-page--login">
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
          {registerMessage ? (
            <div className="auth-notice auth-register-success" role="status" aria-live="polite">
              <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
              <span>{registerMessage}</span>
            </div>
          ) : null}

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

          {error ? <div className="auth-error" role="alert">{error}</div> : null}

          <button className="submit-button" disabled={isLoading} type="submit">
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
          <div className="auth-divider">
            <span>Hoặc</span>
          </div>

          <button className="google-login-button" onClick={handleGoogleLogin} type="button">
            <span className="google-mark">G</span>
            Đăng nhập bằng Google
          </button>
        </form>

        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </section>
    </main>
  )
}
