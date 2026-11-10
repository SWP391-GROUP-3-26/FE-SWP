import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import axiosClient, { GOOGLE_AUTH_URL } from '../api/axiosClient'
import { saveAuth } from '../auth/authStorage'
import { getRouteForRole } from '../auth/roleConfig'
import loginBackgroundVideo from '../assets/login-background.mp4'
import LocalizedContent from '../components/LocalizedContent'
import EmailFlow from '../components/EmailFlow'

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
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(getInitialGoogleError)
  const [flow, setFlow] = useState<'forgot' | 'login' | null>(null)
  const [challenge, setChallenge] = useState(null)
  const [resetDone, setResetDone] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const registerMessage = location.state?.registered
    ? 'Tài khoản đã được tạo thành công. Vui lòng đăng nhập để tiếp tục.'
    : ''

  const handleGoogleLogin = () => {
    setIsLoading(true)
    window.location.href = GOOGLE_AUTH_URL
  }

  const finishLogin = (authData) => {
    const { accessToken, user } = authData || {}
    if (!accessToken || user?.userId == null || !user.role) throw new Error('Invalid login response')
    const { userId, role, fullName, email, username, status, avatarUrl } = user
    saveAuth({ accessToken, userId, role, fullName, email, username, status, avatarUrl })
    navigate(getRouteForRole(role), { replace: true })
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
      if (authData.emailVerificationRequired) {
        if (!authData.emailVerification?.verificationToken) throw new Error('Missing verification context')
        setChallenge(authData.emailVerification)
        setPassword('')
        setFlow('login')
        return
      }
      finishLogin(authData)
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
    <LocalizedContent><main className="auth-page auth-page--login">
      <video
        className="auth-login-video"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={loginBackgroundVideo} type="video/mp4" />
      </video>
      <section className="auth-card">
        {flow ? <EmailFlow mode={flow} initial={challenge}
          onBack={() => { setFlow(null); setChallenge(null) }}
          onDone={(data) => {
            if (flow === 'login') return finishLogin(data)
            setFlow(null)
            setPassword('')
            setResetDone(true)
          }} /> : <>
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
          {resetDone && <div className="auth-notice" role="status">Đã đổi mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.</div>}
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
                aria-label="Mật khẩu"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button className="icon-button" type="button"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}>
                <span className="material-symbols-outlined" aria-hidden="true">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </span>
          </label>

          <button type="button" className="auth-text-action auth-forgot" disabled={isLoading}
            onClick={() => { setFlow('forgot'); setResetDone(false); setError(''); setPassword('') }}>Quên mật khẩu?</button>
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
        </>}
      </section>
    </main></LocalizedContent>
  )
}
