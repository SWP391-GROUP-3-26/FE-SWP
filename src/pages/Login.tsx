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
    ? location.state?.message || 'Dang ky tai khoan thanh cong.'
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
        setError('Phan hoi dang nhap khong dung cau truc Backend hien tai.')
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
        setError('Email, ten tai khoan hoac mat khau khong chinh xac.')
      } else if (requestError?.request) {
        setError('Khong the ket noi Backend. Vui long kiem tra server hoac CORS.')
      } else {
        setError('Dang nhap that bai. Vui long thu lai.')
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
          Quay lai trang chu
        </Link>

        <div className="auth-heading">
          <span className="auth-logo material-symbols-outlined">spa</span>
          <small>SereneDesk Fitness & Sports</small>
          <h1>Dang nhap</h1>
          <p>Chao mung ban quay tro lai voi SereneDesk.</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          {registerMessage ? <div className="auth-notice">{registerMessage}</div> : null}

          <label>
            Email hoac ten tai khoan
            <span className="input-wrap">
              <span className="material-symbols-outlined">badge</span>
              <input
                name="identifier"
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="email@example.com hoac username"
                required
                type="text"
                value={identifier}
              />
            </span>
          </label>

          <label>
            Mat khau
            <span className="input-wrap">
              <span className="material-symbols-outlined">lock</span>
              <input
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhap mat khau"
                required
                type="password"
                value={password}
              />
            </span>
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

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
