import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { saveAuth } from '../auth/authStorage'
import { getRouteForRole } from '../auth/roleConfig'

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [asyncError, setAsyncError] = useState('')
  const [isDoneProcessing, setIsDoneProcessing] = useState(false)
  const hasRequestedRef = useRef(false)

  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')

  const initialError = (() => {
    if (errorParam) {
      if (errorParam === 'google_email_not_verified') {
        return 'Tài khoản Google của bạn chưa được xác thực email.'
      }
      if (errorParam === 'google_authentication_failed') {
        return 'Đăng nhập Google thất bại hoặc bạn đã hủy ủy quyền.'
      }
      if (errorParam === 'google_login_failed') {
        return 'Không thể đăng nhập bằng Google. Vui lòng thử lại.'
      }
      return 'Đã xảy ra lỗi trong quá trình xác thực Google.'
    }
    if (!code) {
      return 'Không tìm thấy mã xác thực Google hợp lệ.'
    }
    return ''
  })()

  const errorMessage = initialError || asyncError
  const isProcessing = !errorMessage && !isDoneProcessing

  useEffect(() => {
    if (initialError || !code) {
      return
    }

    if (hasRequestedRef.current) {
      return
    }
    hasRequestedRef.current = true

    let isMounted = true

    const exchangeCodeForToken = async () => {
      try {
        const response = await axiosClient.get('/api/auth/google/exchange', {
          params: { code },
        })

        const authData = response.data?.data
        if (!authData?.accessToken || !authData?.user) {
          throw new Error('Dữ liệu phản hồi từ máy chủ không hợp lệ.')
        }

        const { accessToken, user } = authData
        const { userId, fullName, username, email, role, status } = user

        if (!role) {
          throw new Error('Không xác định được vai trò người dùng.')
        }

        saveAuth({ accessToken, userId, role, fullName, email, username, status })

        if (isMounted) {
          setIsDoneProcessing(true)
          navigate(getRouteForRole(role), { replace: true })
        }
      } catch (err) {
        if (!isMounted) return
        setIsDoneProcessing(true)
        const serverMessage = err?.response?.data?.message
        if (serverMessage) {
          setAsyncError(serverMessage)
        } else if (err?.response?.status === 401) {
          setAsyncError('Mã đăng nhập Google không hợp lệ hoặc đã hết hạn.')
        } else if (err?.request) {
          setAsyncError('Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra kết nối mạng.')
        } else {
          setAsyncError(err.message || 'Xác thực tài khoản Google thất bại.')
        }
      }
    }

    exchangeCodeForToken()

    return () => {
      isMounted = false
    }
  }, [code, initialError, navigate])

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/login" className="back-link">
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại đăng nhập
        </Link>

        <div className="auth-heading">
          <span className="auth-logo material-symbols-outlined">spa</span>
          <small>SereneDesk Fitness & Sports</small>
          <h1>Xác thực Google</h1>
          <p>
            {isProcessing
              ? 'Đang hoàn tất đăng nhập bằng tài khoản Google của bạn...'
              : 'Kết quả xác thực Google'}
          </p>
        </div>

        {isProcessing && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Đang xử lý...</span>
            </div>
            <p style={{ marginTop: '16px', color: 'var(--muted)', fontWeight: 600 }}>
              Vui lòng đợi trong giây lát...
            </p>
          </div>
        )}

        {errorMessage && (
          <div>
            <div className="auth-error" style={{ marginBottom: '20px' }}>
              {errorMessage}
            </div>
            <Link to="/login" className="submit-button" style={{ display: 'flex', textDecoration: 'none', justifyContent: 'center' }}>
              Thử lại tại trang đăng nhập
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
