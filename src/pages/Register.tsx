import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosClient from '../api/axiosClient'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-z0-9._]+$/
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/
const PHONE_PATTERN = /^0\d{9}$/
const SUPPORTED_PHONE_PREFIXES = new Set([
  '032',
  '033',
  '034',
  '035',
  '036',
  '037',
  '038',
  '039',
  '086',
  '096',
  '097',
  '098',
  '070',
  '076',
  '077',
  '078',
  '079',
  '089',
  '090',
  '093',
  '081',
  '082',
  '083',
  '084',
  '085',
  '088',
  '091',
  '094',
])

function normalizePhone(rawPhone) {
  let phone = rawPhone
    .trim()
    .replaceAll(' ', '')
    .replaceAll('.', '')
    .replaceAll('-', '')
    .replaceAll('(', '')
    .replaceAll(')', '')

  if (phone.startsWith('+84')) {
    phone = `0${phone.slice(3)}`
  } else if (phone.startsWith('84') && phone.length === 11) {
    phone = `0${phone.slice(2)}`
  }

  return phone
}

export default function Register() {
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
  const navigate = useNavigate()

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

  const validateForm = () => {
    const errors = {}
    const username = formData.username.trim().toLowerCase()
    const fullName = formData.fullName.trim()
    const email = formData.email.trim().toLowerCase()
    const phone = normalizePhone(formData.phone)

    if (!username) {
      errors.username = 'Tai khoan la bat buoc.'
    } else if (username.length > 50 || !USERNAME_PATTERN.test(username)) {
      errors.username = 'Tai khoan chi gom chu thuong, so, dau cham hoac gach duoi.'
    }

    if (!fullName) {
      errors.fullName = 'Ho va ten la bat buoc.'
    } else if (fullName.length > 100) {
      errors.fullName = 'Ho va ten khong duoc vuot qua 100 ky tu.'
    }

    if (!email) {
      errors.email = 'Email la bat buoc.'
    } else if (email.length > 100 || !EMAIL_PATTERN.test(email)) {
      errors.email = 'Email khong hop le.'
    }

    if (!phone) {
      errors.phone = 'So dien thoai la bat buoc.'
    } else if (!PHONE_PATTERN.test(phone)) {
      errors.phone = 'So dien thoai khong hop le.'
    } else if (!SUPPORTED_PHONE_PREFIXES.has(phone.slice(0, 3))) {
      errors.phone = 'So dien thoai khong thuoc nha mang duoc ho tro.'
    }

    if (!formData.password) {
      errors.password = 'Mat khau la bat buoc.'
    } else if (
      formData.password.length < 8 ||
      formData.password.length > 72 ||
      !PASSWORD_PATTERN.test(formData.password)
    ) {
      errors.password = 'Mat khau can 8-72 ky tu, co chu hoa, chu thuong, so va ky tu dac biet.'
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Xac nhan mat khau la bat buoc.'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Mat khau xac nhan khong khop.'
    }

    return {
      errors,
      payload: {
        username,
        fullName,
        email,
        phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      },
    }
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')

    const { errors, payload } = validateForm()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsLoading(true)

    try {
      const response = await axiosClient.post('/api/auth/register', payload)
      const message = response.data?.message || 'Dang ky tai khoan thanh cong.'

      navigate('/login', {
        replace: true,
        state: {
          registered: true,
          message,
        },
      })
    } catch (requestError) {
      const status = requestError?.response?.status
      const message = requestError?.response?.data?.message

      if (message) {
        setFormError(message)
      } else if (status === 400) {
        setFormError('Thong tin dang ky khong hop le.')
      } else if (status === 409) {
        setFormError('Tai khoan, email hoac so dien thoai da ton tai.')
      } else if (requestError?.request) {
        setFormError('Khong the ket noi Backend. Vui long kiem tra server hoac CORS.')
      } else {
        setFormError('Dang ky that bai. Vui long thu lai.')
      }
    } finally {
      setIsLoading(false)
    }
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
              Ho va ten
              <span className="input-wrap">
                <span className="material-symbols-outlined">badge</span>
                <input
                  name="fullName"
                  onChange={(event) => updateField('fullName', event.target.value)}
                  placeholder="VD: Nguyen Minh Anh"
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
              So dien thoai
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
              Mat khau
              <span className="input-wrap">
                <span className="material-symbols-outlined">lock</span>
                <input
                  name="password"
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="Toi thieu 8 ky tu"
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
              Xac nhan mat khau
              <span className="input-wrap">
                <span className="material-symbols-outlined">lock_reset</span>
                <input
                  name="confirmPassword"
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  placeholder="Nhap lai mat khau"
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

          <label className="check-row">
            <input required type="checkbox" />
            Toi dong y voi dieu khoan dich vu va chinh sach quyen rieng tu.
          </label>

          {formError ? <div className="auth-error">{formError}</div> : null}

          <button className="submit-button" disabled={isLoading} type="submit">
            {isLoading ? 'Dang dang ky...' : 'Dang ky'}
          </button>
        </form>

        <p className="auth-switch">
          Da co tai khoan? <Link to="/login">Dang nhap ngay</Link>
        </p>
      </section>
    </main>
  )
}
