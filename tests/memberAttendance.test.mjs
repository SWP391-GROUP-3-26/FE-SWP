import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import nativeReact from './ssrDependencies.mjs'
import { memberWeekSchedule, parseCalendarDate } from '../src/utils/classSchedule.js'

const server = await createServer({
  server: { middlewareMode: true, hmr: false }, appType: 'custom', plugins: [nativeReact],
})
try {
  const { default: MemberSessionCard } = await server.ssrLoadModule('/src/components/MemberSessionCard.jsx')
  const registration = {
    bookingId: 10, className: 'Yoga', classCode: 'CLS-010', rawStatus: 'Booked',
    startDate: '2026-10-13', durationWeeks: 1, endDate: '2026-10-18',
    sessions: [
      { sessionId: 20, sessionDate: '2026-10-13', attendanceStatus: 'Present' },
      { sessionId: 21, sessionDate: '2026-10-14', attendanceStatus: 'Absent' },
      { sessionId: 22, sessionDate: '2026-10-15', attendanceStatus: null },
      { sessionId: 23, sessionDate: '2026-10-16' },
    ].map((session) => ({ ...session, rawStatus: 'Completed', sessionStatus: 'Completed',
      sessionStartTime: '07:30', sessionEndTime: '08:45' })),
  }
  const { sessions } = memberWeekSchedule([registration], parseCalendarDate('2026-10-12'))
  const cards = sessions.map((entry) => renderToStaticMarkup(createElement(MemberSessionCard, { entry })))
  assert.equal(cards.length, 4)
  assert.match(cards[0], /member-schedule-attendance is-present/)
  assert.match(cards[0], /aria-hidden="true">check_circle<\/span>Có mặt/)
  assert.doesNotMatch(cards[0], /Vắng mặt/)
  assert.match(cards[1], /member-schedule-attendance is-absent/)
  assert.match(cards[1], /aria-hidden="true">cancel<\/span>Vắng mặt/)
  assert.doesNotMatch(cards[1], /Có mặt/)
  for (const card of cards.slice(2)) {
    assert.match(card, /Đã hoàn thành/)
    assert.doesNotMatch(card, /member-schedule-attendance|Có mặt|Vắng mặt|check_circle/)
  }
  registration.sessions[0].attendanceStatus = 'Absent'
  const updated = memberWeekSchedule([registration], parseCalendarDate('2026-10-12')).sessions[0]
  const updatedCard = renderToStaticMarkup(createElement(MemberSessionCard, { entry: updated }))
  assert.match(updatedCard, /Vắng mặt/)
  assert.doesNotMatch(updatedCard, /Có mặt/)
  console.log('PASS: per-session saved attendance, present/absent icons and labels, no badge for unmarked completed sessions, and updated results')
} finally {
  await server.close()
}
