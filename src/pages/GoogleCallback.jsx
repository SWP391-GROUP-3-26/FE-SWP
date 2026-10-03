import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { saveAuth } from '../auth/authStorage'
import { getRouteForRole } from '../auth/roleConfig'

function resolveErrorParam(errorParam) {
  if (!errorParam) return ''
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

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState({ done: false, error: '' })
  
  // Dùng ref để chống React StrictMode gọi 2 lần trong development
  const exchangedRef = useRef(false)

  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')

  // Lỗi từ query param (nếu BE redirect về ?error=...)
  const paramError = resolveErrorParam(errorParam) || (!code ? 'Không tìm thấy mã xác thực Google hợp lệ.' : '')

  const errorMessage = paramError || status.error
  const isProcessing = !paramError && !status.done

  useEffect(() => {
    // Có lỗi tĩnh hoặc không có code → dừng ngay, không gọi API
    if (paramError || !code) return

    // Chống StrictMode double-mount gọi duplicate (vì code chỉ dùng được 1 lần)
    if (exchangedRef.current) return
    exchangedRef.current = true

    const exchangeCode = async () => {
      try {
        console.log('[GoogleCallback] Bắt đầu trao đổi mã xác thực với Backend...')
        const response = await axiosClient.get('/api/auth/google/exchange', {
          params: { code },
          timeout: 15000, // Timeout 15s tránh treo vô hạn nếu mạng chậm
        })

        const authData = response.data?.data
        if (!authData?.accessToken || !authData?.user) {
          throw new Error('Dữ liệu phản hồi từ máy chủ không hợp lệ.')
        }

        const { accessToken, user } = authData
        const { userId, fullName, username, email, role, status: userStatus } = user

        if (!role) {
          throw new Error('Không xác định được vai trò người dùng.')
        }

        saveAuth({ accessToken, userId, role, fullName, email, username, status: userStatus })
        setStatus({ done: true, error: '' })
        console.log('[GoogleCallback] Đăng nhập Google thành công, chuyển hướng theo role:', role)
        navigate(getRouteForRole(role), { replace: true })
      } catch (err) {
        console.error('[GoogleCallback] Lỗi trao đổi Google code:', err)
        const serverMessage = err?.response?.data?.message
        let msg
        if (serverMessage) {
          msg = serverMessage
        } else if (err?.response?.status === 401) {
          msg = 'Mã đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
        } else if (err?.code === 'ECONNABORTED') {
          msg = 'Quá thời gian kết nối tới máy chủ. Vui lòng thử lại.'
        } else if (err?.request) {
          msg = 'Không thể kết nối đến máy chủ Backend (localhost:8080). Vui lòng kiểm tra server Backend.'
        } else {
          msg = err.message || 'Xác thực tài khoản Google thất bại.'
        }
        setStatus({ done: true, error: msg })
      }
    }

    exchangeCode()
  }, [code, paramError, navigate])

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/login" className="back-link">
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại đăng nhập
        </Link>

        <div className="auth-heading">
          <span className="auth-logo material-symbols-outlined">spa</span>
          <small>SereneDesk Fitness &amp; Sports</small>
          <h1>Xác thực Google</h1>
          <p>
            {isProcessing
              ? 'Đang hoàn tất đăng nhập bằng tài khoản Google của bạn...'
              : 'Kết quả xác thực Google'}
          </p>
        </div>

        {isProcessing && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div
              className="spinner-border text-success"
              role="status"
              style={{ width: '3rem', height: '3rem' }}
            >
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
            <Link
              to="/login"
              className="submit-button"
              style={{ display: 'flex', textDecoration: 'none', justifyContent: 'center' }}
            >
              Thử lại tại trang đăng nhập
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
