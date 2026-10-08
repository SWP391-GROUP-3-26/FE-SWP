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

export function validateRegistration(formData) {
    const errors = {}
    const username = formData.username.trim().toLowerCase()
    const fullName = formData.fullName.trim()
    const email = formData.email.trim().toLowerCase()
    const phone = normalizePhone(formData.phone)

    if (!username) {
      errors.username = 'Tài khoản là bắt buộc.'
    } else if (username.length > 50 || !USERNAME_PATTERN.test(username)) {
      errors.username = 'Tài khoản chỉ gồm chữ thường, số, dấu chấm hoặc dấu gạch dưới.'
    }

    if (!fullName) {
      errors.fullName = 'Họ và tên là bắt buộc.'
    } else if (fullName.length > 100) {
      errors.fullName = 'Họ và tên không được vượt quá 100 ký tự.'
    }

    if (!email) {
      errors.email = 'Email là bắt buộc.'
    } else if (email.length > 100 || !EMAIL_PATTERN.test(email)) {
      errors.email = 'Email không hợp lệ.'
    }

    if (!phone) {
      errors.phone = 'Số điện thoại là bắt buộc.'
    } else if (!PHONE_PATTERN.test(phone)) {
      errors.phone = 'Số điện thoại không hợp lệ.'
    } else if (!SUPPORTED_PHONE_PREFIXES.has(phone.slice(0, 3))) {
      errors.phone = 'Số điện thoại không thuộc nhà mạng được hỗ trợ.'
    }

    if (!formData.password) {
      errors.password = 'Mật khẩu là bắt buộc.'
    } else if (
      formData.password.length < 8 ||
      formData.password.length > 72 ||
      !PASSWORD_PATTERN.test(formData.password)
    ) {
      errors.password = 'Mật khẩu cần có 8-72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.'
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc.'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
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

