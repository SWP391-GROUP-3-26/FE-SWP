import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import nativeReact from './ssrDependencies.mjs'
import { coachWeekSchedule } from '../src/utils/coachSchedule.js'
import { getMonday, parseCalendarDate } from '../src/utils/classSchedule.js'

const week = getMonday(parseCalendarDate('2026-11-01'))
const session = (sessionId, date, startTime = '07:00:00', endTime = '09:15:00', status = 'Scheduled') =>
  ({ sessionId, date, startTime, endTime, status, registeredMembers: 3 })
const classroom = { classId: 10, name: 'Yoga sáng', classCode: 'CLS-010', roomName: 'Phòng Yoga',
  status: 'Active', startDate: '2026-10-26', endDate: '2026-11-08', sessions: [
    session(1, '2026-10-26'), session(2, '2026-11-01', '15:00:00', '17:15:00'),
    session(3, '2026-11-02'), session(4, '2026-10-27', '07:00', '09:15', 'Cancelled'),
    session(1, '2026-10-26'), session(5, '2026-10-25'),
    session(6, '2026-10-28', '18:00', '19:00'), session(7, null),
  ] }
const result = coachWeekSchedule([classroom, { ...classroom, classId: 20, status: 'Cancelled' }], week)
assert.deepEqual(result.sessions.map((entry) => [entry.item.sessionId, entry.dayIndex, entry.slotId]), [[1, 0, 1], [2, 6, 4]])
assert.deepEqual(result.otherSessions.map((entry) => entry.item.sessionId).sort(), [6, 7])
assert.equal(result.sessions[0].startTime, '07:00')
assert.equal(result.sessions[0].item.roomName, 'Phòng Yoga')
assert.deepEqual(coachWeekSchedule([classroom], parseCalendarDate('2026-11-02')).sessions.map((entry) => entry.item.sessionId), [3])
assert.equal(coachWeekSchedule([{ ...classroom, status: 'Completed' }], week).sessions.length, 2, 'Past classes retain real sessions')
assert.equal(coachWeekSchedule([{ ...classroom, sessions: [session(8, '2026-11-09')] }], parseCalendarDate('2026-11-09')).sessions.length, 0)

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', plugins: [nativeReact] })
try {
  const { default: WeeklyTimetable } = await server.ssrLoadModule('/src/components/shared/WeeklyTimetable.jsx')
  const markup = renderToStaticMarkup(createElement(WeeklyTimetable, { weekStart: week, sessions: result.sessions,
    renderSession: (entry) => createElement('span', { key: entry.key }, `session-${entry.item.sessionId}`) }))
  const cells = [...markup.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((match) => match[1])
  assert.equal(cells.length, 28)
  assert.match(cells[0], /session-1/)
  assert.match(cells[27], /session-2/)
  assert.match(markup, /Thứ Hai \(26\/10\)/)
  assert.match(markup, /Chủ Nhật \(01\/11\)/)
  const { default: CoachWeeklySchedule } = await server.ssrLoadModule('/src/components/coach/CoachWeeklySchedule.jsx')
  const render = (props) => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(CoachWeeklySchedule, { classes: [], loading: false, error: '', onRetry() {}, ...props })))
  assert.match(render({}), /Bạn chưa được phân công lớp học/)
  assert.match(render({ loading: true }), /Đang tải lịch dạy/)
  const failed = render({ error: 'Không thể tải lịch' })
  assert.match(failed, /role="alert"/)
  assert.match(failed, /Thử lại/)
  assert.doesNotMatch(failed, /<table/)
  console.log('PASS: real coach sessions, week and term bounds, cancellation, duplicates, historical classes, fallback times, 7-day/4-slot table and loading/error/empty states')
} finally {
  await server.close()
}
