function formatTime(value) {
  return String(value || '').slice(0, 5)
}

function sessionTimeSlot(session, classItem) {
  if (session.sessionStartTime && session.sessionEndTime) {
    return `${formatTime(session.sessionStartTime)} - ${formatTime(session.sessionEndTime)}`
  }
  return String(classItem.timeSlot || '').trim() || 'Giờ chưa cập nhật'
}

export function calendarDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function getCalendarSessions(classes) {
  return classes.flatMap((classItem) => {
    const sessions = Array.isArray(classItem.sessions) && classItem.sessions.length
      ? classItem.sessions
      : classItem.sessionDate
        ? [{
          sessionId: classItem.sessionId,
          sessionDate: classItem.sessionDate,
          sessionStartTime: classItem.sessionStartTime,
          sessionEndTime: classItem.sessionEndTime,
        }]
        : []

    return sessions
      .filter((session) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(session.sessionDate || '')) return false
        if (classItem.startDate && session.sessionDate < classItem.startDate) return false
        if (classItem.endDate && session.sessionDate > classItem.endDate) return false
        return true
      })
      .map((session) => ({
        classItem,
        session,
        date: session.sessionDate,
        timeSlot: sessionTimeSlot(session, classItem),
      }))
  })
}
