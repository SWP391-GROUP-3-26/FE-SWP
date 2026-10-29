import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ReceptionistLayout from '../components/ReceptionistLayout'
import { clearAuth } from '../auth/authStorage'
import { createReceptionistMember, receptionistMemberError } from '../services/receptionistMemberService'
import { validateRegister } from '../utils/registerValidation'
import './ReceptionistMemberRegister.css'

const EMPTY_FORM = { fullName: '', phone: '', email: '', username: '', password: '', confirmPassword: '' }
const FIELD_GROUPS = [
  {
    title: 'Thông tin thành viên', icon: 'badge',
    fields: [
      { name: 'fullName', label: 'Họ và tên', type: 'text', autoComplete: 'name', hint: 'Tối đa 100 ký tự.' },
      { name: 'phone', label: 'Số điện thoại', type: 'tel', autoComplete: 'tel', hint: 'Số di động Việt Nam; có thể nhập đầu +84 hoặc 84.' },
      { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', hint: 'Tối đa 100 ký tự.' },
    ],
  },
  {
    title: 'Tài khoản đăng nhập', icon: 'lock',
    fields: [
      { name: 'username', label: 'Tên đăng nhập', type: 'text', autoComplete: 'off', hint: 'Tối đa 50 ký tự; gồm a–z, 0–9, dấu chấm và gạch dưới.' },
      { name: 'password', label: 'Mật khẩu', type: 'password', autoComplete: 'new-password', hint: '8–72 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.' },
      { name: 'confirmPassword', label: 'Xác nhận mật khẩu', type: 'password', autoComplete: 'new-password', hint: 'Nhập lại đúng mật khẩu, bao gồm khoảng trắng nếu có.' },
    ],
  },
]

export default function ReceptionistMemberRegister() {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [member, setMember] = useState(null)
  const sending = useRef(false)
  const firstInput = useRef(null)
  const successHeading = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (member) successHeading.current?.focus()
    else firstInput.current?.focus()
  }, [member])

  function updateField(name, value) {
    setFormData((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
    setFormError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (sending.current || member) return
    const formElement = event.currentTarget
    const { errors, payload } = validateRegister(formData)
    setFieldErrors(errors)
    setFormError(null)
    const firstError = Object.keys(EMPTY_FORM).find((name) => errors[name])
    if (firstError) {
      formElement.elements.namedItem(firstError)?.focus()
      return
    }
    sending.current = true
    setIsLoading(true)
    try {
      const createdMember = await createReceptionistMember(payload)
      setFormData((current) => ({ ...current, password: '', confirmPassword: '' }))
      setVisiblePasswords({})
      setMember(createdMember)
    } catch (error) {
      sending.current = false
      const detail = receptionistMemberError(error)
      setFormError(detail)
      if (detail.field) setFieldErrors({ [detail.field]: detail.message })
    } finally {
      setIsLoading(false)
    }
  }

  function registerNext() {
    sending.current = false
    setFormData(EMPTY_FORM)
    setFieldErrors({})
    setFormError(null)
    setVisiblePasswords({})
    setMember(null)
  }

  return (
    <ReceptionistLayout className="receptionist-register-page">
      <header className="receptionist-page-intro">
        <Link className="receptionist-back-link" to="/receptionist"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> Quay lại tiếp đón</Link>
        <span className="receptionist-eyebrow">THỦ TỤC TIẾP NHẬN</span>
        <h1>Đăng ký hội viên</h1>
        <p>Tạo tài khoản hội viên. Sau khi hoàn tất, bạn có thể mở hồ sơ để đăng ký gói hoặc lớp theo yêu cầu.</p>
      </header>
      <section className="dashboard-panel member-register-panel">
        {member ? (
          <div className="member-register-success">
            <h3 ref={successHeading} tabIndex={-1}>Tạo thành viên thành công</h3>
            <p role="status">Tài khoản thành viên đã được tạo. Bạn đang tiếp tục sử dụng phiên đăng nhập tiếp tân.</p>
            <dl className="member-register-details">
              {[
                ['Mã thành viên', member.userId], ['Họ và tên', member.fullName],
                ['Tên đăng nhập', member.username], ['Email', member.email],
                ['Số điện thoại', member.phone],
                ['Trạng thái', member.status === 'Active' ? 'Đang hoạt động (Active)' : member.status],
              ].map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <div className="member-register-actions">
              <Link className="member-register-back" to={`/receptionist/members/${member.userId}`}>Mở hồ sơ hội viên</Link>
              <Link className="primary-link" to={`/receptionist/members/${member.userId}/packages`}>Đăng ký gói</Link>
              <Link className="primary-link" to={`/receptionist/members/${member.userId}/classes`}>Đăng ký lớp</Link>
              <button className="primary-link" onClick={registerNext} type="button">Đăng ký thành viên tiếp theo</button>
            </div>
          </div>
        ) : (
          <form className="auth-form member-register-form" noValidate onSubmit={handleSubmit} aria-busy={isLoading}>
            <p className="member-register-note">Các trường có dấu <span aria-hidden="true">*</span> là bắt buộc. Tài khoản được tạo với vai trò thành viên và trạng thái hoạt động.</p>
            <fieldset disabled={isLoading} className="member-register-fields">
              <legend className="visually-hidden">Thông tin đăng ký thành viên mới</legend>
              <div className="member-register-columns">
                {FIELD_GROUPS.map((group) => (
                  <section className="member-register-group" key={group.title} aria-label={group.title}>
                    <h3><span className="material-symbols-outlined" aria-hidden="true">{group.icon}</span> {group.title}</h3>
                    {group.fields.map((field) => {
                      const isPassword = field.type === 'password'
                      const visible = Boolean(visiblePasswords[field.name])
                      const error = fieldErrors[field.name]
                      return (
                        <div className="member-register-field" key={field.name}>
                          <label htmlFor={field.name}>{field.label} <span aria-hidden="true">*</span></label>
                          <div className="input-wrap">
                            <input
                              ref={field.name === 'fullName' ? firstInput : undefined}
                              id={field.name}
                              name={field.name}
                              type={isPassword && visible ? 'text' : field.type}
                              autoComplete={field.autoComplete}
                              autoCapitalize={field.name === 'username' || field.name === 'email' ? 'none' : undefined}
                              spellCheck={false}
                              required
                              aria-invalid={Boolean(error)}
                              aria-describedby={`${field.name}-hint${error ? ` ${field.name}-error` : ''}`}
                              value={formData[field.name]}
                              onChange={(event) => updateField(field.name, event.target.value)}
                            />
                            {isPassword && (
                              <button
                                className="member-register-password-toggle"
                                type="button"
                                aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${field.label.toLowerCase()}`}
                                aria-pressed={visible}
                                onClick={() => setVisiblePasswords((current) => ({ ...current, [field.name]: !visible }))}
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">{visible ? 'visibility_off' : 'visibility'}</span>
                                {visible ? 'Ẩn' : 'Hiện'}
                              </button>
                            )}
                          </div>
                          <small id={`${field.name}-hint`} className="member-register-hint">{field.hint}</small>
                          {error && <span id={`${field.name}-error`} className="field-error">{error}</span>}
                        </div>
                      )
                    })}
                  </section>
                ))}
              </div>
            </fieldset>
            {formError && (
              <div className="auth-error" role="alert">
                {formError.message}
                {formError.requiresLogin && (
                  <button className="member-register-login" type="button" onClick={() => { clearAuth(); navigate('/login') }}>Đăng nhập lại</button>
                )}
              </div>
            )}
            <div className="member-register-actions">
              <button className="submit-button" disabled={isLoading} type="submit">
                {isLoading ? 'Đang tạo thành viên…' : 'Tạo thành viên'}
              </button>
              <button className="member-register-back" disabled={isLoading} type="button" onClick={() => navigate('/receptionist')}>Quay lại</button>
            </div>
            {isLoading && <p className="member-register-note" role="status">Đang tạo thành viên… Vui lòng chờ phản hồi từ máy chủ.</p>}
          </form>
        )}
      </section>
    </ReceptionistLayout>
  )
}
