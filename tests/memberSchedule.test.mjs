import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { calendarDateKey, getCalendarSessions } = await server.ssrLoadModule('/src/utils/memberSchedule.js')
  const classes = [{
    bookingId: 10,
    classId: 5,
    className: 'Boxing cho người mới',
    classCode: 'CLS-005',
    startDate: '2026-03-02',
    endDate: '2026-03-27',
    sessions: [
      { sessionId: 1, sessionDate: '2026-03-02', sessionStartTime: '07:00:00', sessionEndTime: '08:30:00' },
      { sessionId: 2, sessionDate: '2026-03-04', sessionStartTime: '07:00', sessionEndTime: '08:30' },
      { sessionId: 3, sessionDate: '2026-03-30', sessionStartTime: '07:00', sessionEndTime: '08:30' },
    ],
  }]

  const sessions = getCalendarSessions(classes)
  assert.deepEqual(sessions.map(({ date, timeSlot }) => [date, timeSlot]), [
    ['2026-03-02', '07:00 - 08:30'],
    ['2026-03-04', '07:00 - 08:30'],
  ])
  assert.equal(
    sessions.some(({ date }) => date >= '2026-04-19' && date <= '2026-04-25'),
    false,
    'Sessions outside the BE-provided class term must not appear in later weeks',
  )
  assert.equal(calendarDateKey(new Date(2026, 3, 19)), '2026-04-19')

  const legacyClass = {
    bookingId: 11,
    sessionDate: '2026-04-20',
    sessionStartTime: '09:30',
    sessionEndTime: '11:00',
  }
  assert.deepEqual(getCalendarSessions([legacyClass]).map(({ date }) => date), ['2026-04-20'])
  console.log('PASS: calendar displays only actual sessions within class dates')
} finally {
  await server.close()
}
