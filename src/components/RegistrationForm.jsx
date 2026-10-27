import { useState } from 'react'
import { validateRegistration } from '../utils/registration'

function registrationErrorMessage(error) {
  const status = error?.response?.status
  const message = String(error?.response?.data?.message || '').toLocaleLowerCase('vi')
  if (status === 409) {
    if (message.includes('username') || message.includes('tên tài khoản')) return 'Tên tài khoản này đã được sử dụng.'
    if (message.includes('email')) return 'Địa chỉ email này đã được sử dụng.'
    if (message.includes('phone') || message.includes('điện thoại')) return 'Số điện thoại này đã được sử dụng.'
    return 'Thông tin tài khoản đã được sử dụng. Vui lòng kiểm tra lại tên tài khoản, email và số điện thoại.'
  }
  if (status === 400) return 'Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.'
  if (status === 401 || status === 403) return 'Phiên đăng nhập đã hết hạn hoặc bạn không có quyền thực hiện thao tác này.'
  if (error?.request) return 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
  return 'Đăng ký tài khoản chưa thành công. Vui lòng thử lại.'
}

export default function RegistrationForm({ submitRegistration, onSuccess, showTermsAgreement = true }) {
  const [successMessage, setSuccessMessage] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  const updateField = (fieldName, value) => {
    setFormData((current) => ({
      ...current,
      [fieldName]: value,
    }))
    setFieldErrors((current) => ({
      ...current,
      [fieldName]: '',
    }))
    setFormError('')
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    if (isLoading) return
    setFormError('')
    setSuccessMessage('')

    const { errors, payload } = validateRegistration(formData)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsLoading(true)

    try {
      await submitRegistration(payload)
      const message = 'Đăng ký tài khoản thành công.'
      if (onSuccess) {
        onSuccess(message)
      } else {
        setFormData({ username: '', fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
        setShowPassword(false)
        setShowConfirmPassword(false)
        setSuccessMessage(message)
        event.target.reset()
      }
    } catch (requestError) {
      setFormError(registrationErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }

  return (
        <form className="auth-form" onSubmit={handleRegister}>
          <fieldset disabled={isLoading} className="registration-fields">
          <div className="form-grid">
            <label>
              Tài khoản
              <span className="input-wrap">
                <span className="material-symbols-outlined">person_outline</span>
                <input
                  name="username"
                  onChange={(event) => updateField('username', event.target.value)}
                  placeholder="VD: minh_anh88"
                  required
                  type="text"
                  value={formData.username}
                />
              </span>
              {fieldErrors.username ? <span className="field-error">{fieldErrors.username}</span> : null}
            </label>

            <label>
              Họ và tên
              <span className="input-wrap">
                <span className="material-symbols-outlined">badge</span>
                <input
                  name="fullName"
                  onChange={(event) => updateField('fullName', event.target.value)}
                  placeholder="VD: Nguyễn Minh Anh"
                  required
                  type="text"
                  value={formData.fullName}
                />
              </span>
              {fieldErrors.fullName ? <span className="field-error">{fieldErrors.fullName}</span> : null}
            </label>

            <label>
              Email
              <span className="input-wrap">
                <span className="material-symbols-outlined">mail</span>
                <input
                  name="email"
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="minhanh@example.com"
                  required
                  type="email"
                  value={formData.email}
                />
              </span>
              {fieldErrors.email ? <span className="field-error">{fieldErrors.email}</span> : null}
            </label>

            <label>
              Số điện thoại
              <span className="input-wrap">
                <span className="material-symbols-outlined">call</span>
                <input
                  name="phone"
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="0912 345 678"
                  required
                  type="tel"
                  value={formData.phone}
                />
              </span>
              {fieldErrors.phone ? <span className="field-error">{fieldErrors.phone}</span> : null}
            </label>

            <label>
              Mật khẩu
              <span className="input-wrap">
                <span className="material-symbols-outlined">lock</span>
                <input
                  name="password"
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
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
              {fieldErrors.password ? <span className="field-error">{fieldErrors.password}</span> : null}
            </label>

            <label>
              Xác nhận mật khẩu
              <span className="input-wrap">
                <span className="material-symbols-outlined">lock_reset</span>
                <input
                  name="confirmPassword"
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
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
              {fieldErrors.confirmPassword ? (
                <span className="field-error">{fieldErrors.confirmPassword}</span>
              ) : null}
            </label>
          </div>

          {showTermsAgreement ? (
            <label className="check-row">
            <input required type="checkbox" />
            Tôi đồng ý với điều khoản dịch vụ và chính sách quyền riêng tư.
            </label>
          ) : null}

          </fieldset>
          {successMessage ? <div className="auth-notice" role="status">{successMessage}</div> : null}
          {formError ? <div className="auth-error" role="alert">{formError}</div> : null}

          <button className="submit-button" disabled={isLoading} type="submit">
            {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

  )
}
