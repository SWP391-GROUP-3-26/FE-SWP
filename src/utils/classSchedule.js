export const CLASS_WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
export const MEMBER_TIME_SLOTS = [
  { id: 1, startTime: '07:00', endTime: '09:15' },
  { id: 2, startTime: '09:30', endTime: '11:45' },
  { id: 3, startTime: '12:30', endTime: '14:45' },
  { id: 4, startTime: '15:00', endTime: '17:15' },
]

export function parseCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1 || year > 9999) return null
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

export function calendarDateKey(date) {
  return [String(date.getFullYear()).padStart(4, '0'), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-')
}

export function formatClassDate(value) {
  const date = parseCalendarDate(value)
  return date ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : 'Chưa thiết lập'
}

export function addCalendarDays(date, amount) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

export function getMonday(date) {
  const monday = addCalendarDays(date, -((date.getDay() + 6) % 7))
  monday.setHours(12, 0, 0, 0)
  return monday
}

export function calculateClassEndDate(startDate, durationWeeks) {
  const start = parseCalendarDate(startDate)
  const weeks = Number(durationWeeks)
  if (!start || !Number.isInteger(weeks) || weeks < 1 || weeks > 2147483647) return null
  const end = addCalendarDays(start, (7 - start.getDay()) % 7 + (weeks - 1) * 7)
  if (!Number.isFinite(end.getTime()) || end.getFullYear() > 9999) return null
  return calendarDateKey(end)
}

function weekdayIndex(day) {
  const value = String(day).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\s]/g, '')
  const aliases = [
    ['t2', 'thu2', 'thuhai', 'monday', 'mon'], ['t3', 'thu3', 'thuba', 'tuesday', 'tue'],
    ['t4', 'thu4', 'thutu', 'wednesday', 'wed'], ['t5', 'thu5', 'thunam', 'thursday', 'thu'],
    ['t6', 'thu6', 'thusau', 'friday', 'fri'], ['t7', 'thu7', 'thubay', 'saturday', 'sat'],
    ['cn', 'chunhat', 'sunday', 'sun'],
  ]
  return aliases.findIndex((values) => values.includes(value))
}

export function validateClassTerm({ startDate, durationWeeks, daysOfWeek }) {
  const errors = {}
  const start = parseCalendarDate(startDate)
  if (!start) errors.startDate = 'Vui lòng nhập ngày bắt đầu hợp lệ.'
  else if (!daysOfWeek.some((day) => weekdayIndex(day) === (start.getDay() + 6) % 7)) {
    errors.startDate = 'Ngày bắt đầu là buổi học đầu tiên, phải thuộc một trong các thứ đã chọn.'
  }
  const weeks = Number(durationWeeks)
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 2147483647) {
    errors.durationWeeks = 'Số tuần học phải là số nguyên dương.'
  } else if (start && !calculateClassEndDate(startDate, weeks)) {
    errors.durationWeeks = 'Thời hạn lớp vượt phạm vi ngày hợp lệ (đến năm 9999).'
  }
  return errors
}

function timeMinutes(value) {
  const match = typeof value === 'string' && value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] || 0) > 59) return null
  return Number(match[1]) * 60 + Number(match[2]) + Number(match[3] || 0) / 60
}

export function getSessionTimes(item) {
  const legacy = String(item.timeSlot || '').match(/^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/)
  return { startTime: item.sessionStartTime ?? legacy?.[1] ?? '', endTime: item.sessionEndTime ?? legacy?.[2] ?? '' }
}

export function memberSlotId(startTime, endTime) {
  const start = timeMinutes(startTime)
  const end = timeMinutes(endTime)
  if (start === null || end === null || end <= start) return null
  return MEMBER_TIME_SLOTS.find((slot) => start >= timeMinutes(slot.startTime) && end <= timeMinutes(slot.endTime))?.id ?? null
}

export function isConfirmedBooking(item) {
  return item.rawStatus ? ['Booked', 'Completed'].includes(item.rawStatus)
    : ['Đang diễn ra', 'Đã hoàn thành'].includes(item.status)
}

export function memberWeekSchedule(items, weekStart) {
  const first = calendarDateKey(weekStart)
  const last = calendarDateKey(addCalendarDays(weekStart, 6))
  const sessions = []
  const otherSessions = []
  const bookedSessions = items.flatMap((item) => Array.isArray(item.sessions)
    ? item.sessions.map((session) => ({ ...item, ...session })) : [item])
  const seen = new Set()
  for (const item of bookedSessions) {
    if (!isConfirmedBooking(item) || item.sessionStatus === 'Cancelled') continue
    const key = `${item.bookingId}-${item.sessionId ?? item.sessionDate}`
    if (seen.has(key)) continue
    seen.add(key)
    const date = parseCalendarDate(item.sessionDate)
    const start = parseCalendarDate(item.startDate)
    const end = parseCalendarDate(item.endDate)
    const dateKey = date ? calendarDateKey(date) : null
    if (dateKey && (dateKey < first || dateKey > last ||
      (start && dateKey < item.startDate) || (end && dateKey > item.endDate))) continue
    const times = getSessionTimes(item)
    const slotId = memberSlotId(times.startTime, times.endTime)
    const reasons = []
    if (!date) reasons.push('Chưa có ngày buổi học hợp lệ; chưa thể xếp vào tuần cụ thể.')
    if (!start || !end || !Number.isInteger(item.durationWeeks) || item.durationWeeks < 1) {
      reasons.push('Thời hạn lớp: Chưa thiết lập đầy đủ.')
    }
    if (!slotId) reasons.push('Giờ học nằm ngoài 4 slot hoặc chưa được cập nhật.')
    const entry = { key, item, date: dateKey, dayIndex: date ? (date.getDay() + 6) % 7 : null, slotId, ...times, reasons }
    if (reasons.length) otherSessions.push(entry)
    else sessions.push(entry)
  }
  return { sessions, otherSessions }
}
