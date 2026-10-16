import assert from 'node:assert/strict'
import {
  calculateClassEndDate, calendarDateKey, getMonday, memberSlotId,
  memberWeekSchedule, parseCalendarDate, validateClassTerm,
} from '../src/utils/classSchedule.js'

const originalTimezone = process.env.TZ
try {
  for (const timezone of ['Asia/Ho_Chi_Minh', 'America/Los_Angeles', 'Pacific/Auckland']) {
    process.env.TZ = timezone
    for (const [start, weeks, expected] of [
      ['2026-10-13', 1, '2026-10-18'], ['2026-10-18', 1, '2026-10-18'],
      ['2026-10-18', 2, '2026-10-25'], ['2026-10-31', 2, '2026-11-08'],
      ['2026-12-31', 2, '2027-01-10'], ['2024-02-29', 1, '2024-03-03'],
    ]) assert.equal(calculateClassEndDate(start, weeks), expected, timezone)
    assert.equal(calendarDateKey(parseCalendarDate('2026-10-13')), '2026-10-13')
    assert.equal(calendarDateKey(getMonday(parseCalendarDate('2026-10-18'))), '2026-10-12')
    assert.equal(calculateClassEndDate('9999-12-31', 1), null)
  }
} finally {
  if (originalTimezone === undefined) delete process.env.TZ
  else process.env.TZ = originalTimezone
}
for (const value of ['', null, '2026-02-29', '2026-04-31', '2026-10-13T00:00:00Z', '0000-01-01']) {
  assert.equal(parseCalendarDate(value), null)
}
const validTerm = { startDate: '2026-10-13', durationWeeks: '1', daysOfWeek: ['T3', 'T5'] }
assert.deepEqual(validateClassTerm(validTerm), {})
assert.ok(validateClassTerm({ ...validTerm, daysOfWeek: ['Thứ 2'] }).startDate)
assert.deepEqual(validateClassTerm({ ...validTerm, daysOfWeek: ['Thứ 3'] }), {})
assert.deepEqual(validateClassTerm({ startDate: '2026-10-18', durationWeeks: '1', daysOfWeek: ['CN'] }), {})
assert.ok(validateClassTerm({ ...validTerm, startDate: '' }).startDate)
for (const durationWeeks of ['', ' ', '0', '-1', '1.5', 'NaN', 'Infinity', '2147483648']) {
  assert.ok(validateClassTerm({ ...validTerm, durationWeeks }).durationWeeks)
}

assert.equal(memberSlotId('07:30', '08:45'), 1)
assert.equal(memberSlotId('07:00', '09:15'), 1)
assert.equal(memberSlotId('09:30', '11:45'), 2)
assert.equal(memberSlotId('12:30', '14:45'), 3)
assert.equal(memberSlotId('15:00', '17:15'), 4)
for (const [start, end] of [['06:59', '08:00'], ['09:00', '09:30'], ['09:15', '09:30'],
  ['18:00', '19:00'], ['08:00', '07:00'], ['07:00', '09:15:01'], ['99:00', '10:00'], ['', '08:00']]) {
  assert.equal(memberSlotId(start, end), null)
}

// These session/booking fixtures reproduce the verified MyClassItemResponse contract.
const base = {
  classId: 1, bookingId: 1, className: 'Yoga', rawStatus: 'Booked', status: 'Đang diễn ra',
  startDate: '2026-10-13', durationWeeks: 2, endDate: '2026-10-25', schedule: 'T3, T5',
  sessionId: 1, sessionDate: '2026-10-13', sessionStartTime: '07:30', sessionEndTime: '08:45',
  sessionStatus: 'Scheduled', timeSlot: '07:30 - 08:45',
}
const items = [base,
  { ...base, bookingId: 2, sessionDate: '2026-10-20' },
  { ...base, bookingId: 3, sessionDate: '2026-10-12' }, // Before the first class day.
  { ...base, bookingId: 4, sessionDate: '2026-10-27' }, // Beyond the backend end date.
  { ...base, bookingId: 5, rawStatus: 'Completed', sessionStatus: 'Completed', sessionDate: '2026-10-15' },
  { ...base, bookingId: 6, rawStatus: 'Pending' },
  { ...base, bookingId: 7, rawStatus: 'Cancelled' },
  { ...base, bookingId: 8, sessionStatus: 'Cancelled' },
  { ...base, bookingId: 9, sessionStartTime: '18:00', sessionEndTime: '19:30' },
  { ...base, bookingId: 10, durationWeeks: null, endDate: null },
  { ...base, bookingId: 11, sessionDate: null },
  { ...base, bookingId: 12, sessionStartTime: null, sessionEndTime: null },
]
const firstWeek = memberWeekSchedule(items, parseCalendarDate('2026-10-12'))
assert.deepEqual(firstWeek.sessions.map((entry) => entry.item.bookingId), [1, 5, 12])
assert.deepEqual(firstWeek.sessions.map((entry) => entry.dayIndex), [1, 3, 1])
assert.deepEqual(firstWeek.otherSessions.map((entry) => entry.item.bookingId), [9, 10, 11])
assert.ok(firstWeek.otherSessions[1].reasons.some((reason) => reason.includes('Chưa thiết lập')))
assert.deepEqual(memberWeekSchedule(items, parseCalendarDate('2026-10-19')).sessions.map((entry) => entry.item.bookingId), [2])
assert.equal(memberWeekSchedule(items, parseCalendarDate('2026-10-26')).sessions.length, 0)
assert.equal(memberWeekSchedule([base], parseCalendarDate('2026-10-05')).sessions.length, 0)
assert.equal(memberWeekSchedule([{ ...base, sessionDate: '2026-10-25' }], parseCalendarDate('2026-10-19')).sessions.length, 1)
assert.equal(memberWeekSchedule([{ ...base, startDate: null, durationWeeks: null, endDate: null }], parseCalendarDate('2026-10-12')).otherSessions.length, 1)
console.log('PASS: local calendar end dates across timezones, required term/weekday validation, fixed slot containment, dated weeks, term bounds, completed bookings and legacy exceptions (fixtures)')

const registration = { ...base, sessionCount: 4, sessions: ['2026-10-13', '2026-10-15', '2026-10-20', '2026-10-22']
  .map((sessionDate, index) => ({ sessionId: 20 + index, sessionDate, sessionStartTime: '07:30',
    sessionEndTime: '08:45', sessionStatus: 'Scheduled', rawStatus: 'Booked' })) }
assert.equal(memberWeekSchedule([registration], parseCalendarDate('2026-10-12')).sessions.length, 2)
assert.equal(memberWeekSchedule([registration], parseCalendarDate('2026-10-19')).sessions.length, 2)
assert.equal(memberWeekSchedule([registration], parseCalendarDate('2026-10-26')).sessions.length, 0)
assert.equal(memberWeekSchedule([{ ...registration, rawStatus: 'Pending', sessions: registration.sessions.map((s) => ({ ...s, rawStatus: 'Pending' })) }],
  parseCalendarDate('2026-10-12')).sessions.length, 0)
assert.equal(memberWeekSchedule([registration, registration], parseCalendarDate('2026-10-12')).sessions.length, 2)
assert.equal(new Set(memberWeekSchedule([registration], parseCalendarDate('2026-10-12')).sessions.map((entry) => entry.key)).size, 2)
console.log('PASS: one registration includes four real sessions across two weeks, unique keys, pending excluded, no sessions after end')
