import { addCalendarDays, calendarDateKey, memberSlotId, parseCalendarDate } from './classSchedule.js'

export function coachWeekSchedule(classes, weekStart) {
  const first = calendarDateKey(weekStart)
  const last = calendarDateKey(addCalendarDays(weekStart, 6))
  const sessions = [], otherSessions = []
  const seen = new Set()
  for (const classroom of classes) {
    if (['cancel', 'cancelled'].includes(classroom.status?.toLowerCase())) continue
    for (const session of classroom.sessions || []) {
      if (['cancel', 'cancelled'].includes(session.status?.toLowerCase())) continue
      const key = `${classroom.classId}-${session.sessionId}`
      if (seen.has(key)) continue
      seen.add(key)
      const date = parseCalendarDate(session.date)
      const dateKey = date ? calendarDateKey(date) : null
      if (dateKey && (dateKey < first || dateKey > last ||
        (classroom.startDate && dateKey < classroom.startDate) || (classroom.endDate && dateKey > classroom.endDate))) continue
      const startTime = session.startTime?.slice(0, 5) || ''
      const endTime = session.endTime?.slice(0, 5) || ''
      const slotId = memberSlotId(session.startTime, session.endTime)
      const reasons = []
      if (!date) reasons.push('Chưa có ngày buổi dạy hợp lệ.')
      if (!slotId) reasons.push('Giờ dạy nằm ngoài 4 slot hoặc chưa được cập nhật.')
      const entry = { key, date: dateKey, dayIndex: date ? (date.getDay() + 6) % 7 : null,
        slotId, startTime, endTime, reasons,
        item: { ...classroom, ...session, className: classroom.name, sessionStatus: session.status } }
      if (reasons.length) otherSessions.push(entry)
      else sessions.push(entry)
    }
  }
  const byTime = (a, b) => (a.date || '').localeCompare(b.date || '') || a.startTime.localeCompare(b.startTime)
  return { sessions: sessions.sort(byTime), otherSessions: otherSessions.sort(byTime) }
}
