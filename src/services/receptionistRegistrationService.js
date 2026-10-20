import axiosClient from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'
import { getMemberById } from './memberService'

const base = '/api/receptionist/registrations'

async function request(path, { body, signal, params } = {}) {
  const token = getAccessToken()
  const config = { signal, params, timeout: 15000, headers: token ? { Authorization: `Bearer ${token}` } : {} }
  const response = body === undefined
    ? await axiosClient.get(`${base}${path}`, config)
    : await axiosClient.post(`${base}${path}`, body, config)
  if (response.data?.success !== true) throw new Error(response.data?.message || 'Không thể thực hiện đăng ký cho hội viên.')
  return response.data
}

function memberPath(id) {
  if (!/^[1-9]\d{0,9}$/.test(String(id)) || Number(id) > 2147483647) throw new Error('Mã hội viên không hợp lệ.')
  return `/members/${id}`
}

export async function getReceptionistClasses({ search = '', signal } = {}) {
  const result = await request('/classes', { params: { search }, signal })
  if (!Array.isArray(result.data)) throw new Error('Danh sách lớp không hợp lệ.')
  return result.data.map((item) => ({ ...item, price: item.pricePerSession, remainingSlots: item.availableSeats,
    canRegister: item.available, sessionId: item.upcomingSessions ? undefined : null }))
}

export async function getReceptionistPreview(memberId, classId, { signal } = {}) {
  const p = await request(`${memberPath(memberId)}/classes/${encodeURIComponent(classId)}`, { signal })
  return { ...p, className: p.classInfo.name, coachName: p.classInfo.coachName, roomName: p.classInfo.roomName,
    schedule: `${p.classInfo.daysOfWeek || ''} · ${p.classInfo.startTime || ''}–${p.classInfo.endTime || ''}`,
    price: p.classInfo.pricePerSession, totalAmount: p.directPaymentAmount,
    startDate: p.classInfo.startDate, endDate: p.classInfo.endDate, sessionCount: p.sessions.length,
    sessions: p.sessions.map((s) => ({ ...s, sessionDate: s.date, sessionStartTime: s.startTime, sessionEndTime: s.endTime })),
    packageOption: { eligible: p.canPayWithPackage, title: p.packageName || 'Trừ gói hội viên',
      requiredSessions: p.requiredPackageClasses, remainingSessions: p.remainingPackageClasses },
    directPaymentOption: { available: p.canRegister, title: 'Thanh toán học phí' } }
}

export function registerReceptionistClass(memberId, classId, payload) {
  return request(`${memberPath(memberId)}/classes`, { body: { classId, ...payload } })
}

export async function getReceptionistRegistrations(memberId, { signal, status = 'all', search = '' } = {}) {
  const result = await request(`${memberPath(memberId)}/classes`, { signal })
  if (!Array.isArray(result.classes)) throw new Error('Danh sách đăng ký không hợp lệ.')
  return { ...result, classes: result.classes.filter((item) =>
    (status === 'all' || item.rawStatus === status || (status === 'ongoing' && item.rawStatus === 'Booked') ||
      (status === 'completed' && item.rawStatus === 'Completed') || (status === 'cancelled' && item.rawStatus === 'Cancelled')) &&
    `${item.className} ${item.coachName} ${item.roomName}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))) }
}

export function cancelReceptionistClass(memberId, bookingId) {
  return request(`${memberPath(memberId)}/classes/bookings/${bookingId}/cancel`, { body: {} })
}

export async function getReceptionistPackages({ search = '', page = 0, size = 20, signal } = {}) {
  const result = await request('/packages', { params: { search }, signal })
  if (!Array.isArray(result.data)) throw new Error('Danh sách gói không hợp lệ.')
  return { ...result, total: result.data.length,
    data: result.data.slice(page * size, (page + 1) * size).map((p) => ({ ...p, id: p.packageId })) }
}

export function getReceptionistSubscriptions(memberId, { signal } = {}) {
  return request(`${memberPath(memberId)}/packages`, { signal })
}

export async function getReceptionistPackage(packageId, { signal } = {}) {
  const result = await request('/packages', { signal })
  if (!Array.isArray(result.data)) throw new Error('Danh sách gói không hợp lệ.')
  const item = result.data.find((pack) => pack.packageId === Number(packageId))
  if (!item) throw new Error('Không tìm thấy gói tập đang mở bán. Vui lòng chọn lại gói.')
  return { ...item, id: item.packageId }
}

export function registerReceptionistPackage(memberId, payload) {
  return request(`${memberPath(memberId)}/packages`, { body: payload })
}

export function cancelReceptionistPayment(memberId, paymentId) {
  return request(`${memberPath(memberId)}/payments/${paymentId}/cancel`, { body: {} })
}

export async function getReceptionistCheckout(memberId, serviceType, serviceId, { signal } = {}) {
  memberPath(memberId)
  if (!['classes', 'packages'].includes(serviceType) ||
    !/^[1-9]\d{0,9}$/.test(String(serviceId)) || Number(serviceId) > 2147483647) {
    throw new Error('Đường dẫn thanh toán không hợp lệ. Vui lòng chọn lại lớp hoặc gói.')
  }
  const [member, item, subscriptions] = await Promise.all([
    getMemberById(memberId, signal),
    serviceType === 'classes' ? getReceptionistPreview(memberId, serviceId, { signal })
      : getReceptionistPackage(serviceId, { signal }),
    serviceType === 'packages' ? getReceptionistSubscriptions(memberId, { signal }) : null,
  ])
  if (member.userId !== Number(memberId) || (serviceType === 'classes' &&
    (item.memberId !== member.userId || item.classInfo.classId !== Number(serviceId)))) {
    throw new Error('Thông tin đăng ký không khớp với hội viên hoặc dịch vụ đã chọn.')
  }
  if (subscriptions && !Array.isArray(subscriptions.data)) throw new Error('Lịch sử gói từ máy chủ không hợp lệ.')
  const amount = serviceType === 'classes' ? item.totalAmount : item.price
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    throw new Error('Chưa xác định được học phí. Vui lòng chọn lại dịch vụ.')
  }
  return { member, item, subscriptions: subscriptions?.data || [], amount }
}
