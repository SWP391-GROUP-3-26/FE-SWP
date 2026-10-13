import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

export async function createReceptionistMember({ username, fullName, email, phone, password, confirmPassword }) {
  const token = getAccessToken()
  if (!token) {
    const error = new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.')
    error.response = { status: 401 }
    throw error
  }
  const response = await axiosClient.request({
    method: 'post',
    url: '/api/receptionist/members',
    data: { username, fullName, email, phone, password, confirmPassword },
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  })
  if (response.status !== 201 || response.data?.success !== true || !response.data?.data?.userId) {
    throw new Error('Chưa xác nhận được kết quả tạo thành viên. Vui lòng kiểm tra trước khi tạo lại.')
  }
  return response.data.data
}

async function requestMemberRead(path, params, signal) {
  const token = getAccessToken()
  if (!token) {
    const error = new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.')
    error.response = { status: 401 }
    throw error
  }
  const response = await axiosClient.request({
    method: 'get',
    url: `/api/receptionist/members${path}`,
    params,
    signal,
    timeout: 15000,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status !== 200 || response.data?.success !== true) {
    throw new Error('Không thể tải thông tin thành viên. Vui lòng thử lại.')
  }
  return response.data
}

const PROFILE_STRING_FIELDS = ['fullName', 'username', 'email', 'phone', 'dob', 'gender', 'address', 'avatarUrl', 'status']

function isMemberProfile(member) {
  return member !== null && typeof member === 'object' && !Array.isArray(member)
    && Number.isInteger(member.userId)
    && typeof member.role === 'string' && member.role.toLowerCase() === 'member'
    && PROFILE_STRING_FIELDS.every((field) => member[field] === null || typeof member[field] === 'string')
}

export async function searchReceptionistMembers({ keyword = '', page = 0, size = 20 } = {}, signal) {
  const result = await requestMemberRead('', { keyword: keyword.trim(), page, size }, signal)
  if (!Array.isArray(result.data) || !result.data.every(isMemberProfile)
    || !Number.isSafeInteger(result.total) || result.total < 0
    || !Number.isInteger(result.page) || result.page < 0
    || !Number.isInteger(result.size) || result.size < 1 || result.size > 100) {
    throw new Error('Kết quả tìm kiếm từ máy chủ không hợp lệ. Vui lòng thử lại.')
  }
  return result
}

export async function getReceptionistMemberById(userId, signal) {
  const result = await requestMemberRead(`/${encodeURIComponent(userId)}`, undefined, signal)
  if (!isMemberProfile(result.data) || result.data.userId !== userId) {
    throw new Error('Hồ sơ thành viên từ máy chủ không hợp lệ. Vui lòng thử lại.')
  }
  return result.data
}

export function receptionistMemberReadError(error, operation = 'search') {
  const status = error.response?.status
  const detail = operation === 'detail'
  if (status === 400) return { message: detail ? 'Mã thành viên không hợp lệ.' : 'Tham số tìm kiếm không hợp lệ. Vui lòng kiểm tra lại.' }
  if (status === 401) return { message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.', requiresLogin: true }
  if (status === 403) return { message: detail ? 'Bạn không có quyền xem hồ sơ thành viên.' : 'Bạn không có quyền tìm kiếm thành viên.' }
  if (status === 404 && detail) return { message: 'Thành viên không còn khả dụng. Vui lòng tìm kiếm lại.' }
  if (status >= 500) return { message: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.', retryable: true }
  if (error.request) return { message: 'Không thể kết nối máy chủ hoặc chưa nhận được phản hồi. Vui lòng thử lại.', retryable: true }
  return { message: error.message || 'Không thể tải thông tin thành viên. Vui lòng thử lại.', retryable: true }
}

// Only exact messages from the backend contract identify a field reliably.
const FIELD_MESSAGES = {
  'username da ton tai': ['username', 'Tên đăng nhập đã tồn tại.'],
  'email da ton tai': ['email', 'Email đã tồn tại.'],
  'phone da ton tai': ['phone', 'Số điện thoại đã tồn tại.'],
  'username khong hop le': ['username', 'Tên đăng nhập không hợp lệ.'],
  'full name khong hop le': ['fullName', 'Họ và tên không hợp lệ.'],
  'email khong hop le': ['email', 'Email không hợp lệ.'],
  'so dien thoai khong hop le': ['phone', 'Số điện thoại không hợp lệ.'],
  'so dien thoai khong thuoc nha mang duoc ho tro': ['phone', 'Số điện thoại không thuộc nhà mạng được hỗ trợ.'],
  'password khong hop le': ['password', 'Mật khẩu cần có 8–72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.'],
  'confirm password khong khop': ['confirmPassword', 'Mật khẩu xác nhận không khớp.'],
  'username is required': ['username', 'Tên đăng nhập là bắt buộc.'],
  'username must not exceed 50 characters': ['username', 'Tên đăng nhập không được vượt quá 50 ký tự.'],
  'full name is required': ['fullName', 'Họ và tên là bắt buộc.'],
  'full name must not exceed 100 characters': ['fullName', 'Họ và tên không được vượt quá 100 ký tự.'],
  'email is required': ['email', 'Email là bắt buộc.'],
  'email must not exceed 255 characters': ['email', 'Email không được vượt quá 100 ký tự.'],
  'phone is required': ['phone', 'Số điện thoại là bắt buộc.'],
  'phone must not exceed 32 characters': ['phone', 'Số điện thoại không hợp lệ.'],
  'password is required': ['password', 'Mật khẩu là bắt buộc.'],
  'password must not exceed 72 characters': ['password', 'Mật khẩu không được vượt quá 72 ký tự.'],
  'confirm password is required': ['confirmPassword', 'Xác nhận mật khẩu là bắt buộc.'],
  'confirm password must not exceed 72 characters': ['confirmPassword', 'Xác nhận mật khẩu không được vượt quá 72 ký tự.'],
}

export function receptionistMemberError(error) {
  const status = error.response?.status
  const serverMessage = error.response?.data?.message
  if (status === 401) return { message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.', requiresLogin: true }
  if (status === 403) return { message: 'Bạn không có quyền tạo thành viên. Vui lòng kiểm tra tài khoản tiếp tân.' }
  if (status >= 500) return { message: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.' }
  if (status === 400 || status === 409) {
    const key = typeof serverMessage === 'string' ? serverMessage.trim().toLowerCase() : ''
    const match = Object.hasOwn(FIELD_MESSAGES, key) ? FIELD_MESSAGES[key] : undefined
    if (match) return { message: match[1], field: match[0] }
    if (serverMessage === 'Du lieu da ton tai') return { message: 'Tên đăng nhập, email hoặc số điện thoại đã tồn tại. Vui lòng kiểm tra lại.' }
    if (serverMessage === 'Request khong hop le' || serverMessage === 'Request không hợp lệ') return { message: 'Thông tin thành viên không hợp lệ. Vui lòng kiểm tra lại.' }
    return {
      message: serverMessage || (status === 409
        ? 'Tên đăng nhập, email hoặc số điện thoại đã tồn tại. Vui lòng kiểm tra lại.'
        : 'Thông tin thành viên không hợp lệ. Vui lòng kiểm tra lại.'),
    }
  }
  if (error.request) return { message: 'Không thể kết nối máy chủ hoặc chưa nhận được phản hồi. Vui lòng kiểm tra kết nối và thử lại.' }
  return { message: error.message || 'Không thể tạo thành viên. Vui lòng thử lại.' }
}
