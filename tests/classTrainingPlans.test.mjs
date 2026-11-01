import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import nativeReact from './ssrDependencies.mjs'

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', plugins: [nativeReact] })
try {
  const { default: Cards } = await server.ssrLoadModule('/src/components/TrainingPlanCards.jsx')
  const { default: Recipients } = await server.ssrLoadModule('/src/components/TrainingPlanRecipients.jsx')
  const plan = { id: 10, scope: 'CLASS', status: 'ASSIGNED', title: 'Kế hoạch chung', className: 'Lớp A', memberName: 'Cả lớp',
    coachName: 'Coach', recipientCount: 2, totalExercises: 4, completedExercises: 1, editable: true,
    eligibleNewMembers: [{ memberId: 4, memberName: 'Học viên mới' }],
    recipients: [
      { memberId: 2, memberName: 'An', enrolled: true, unread: false, completedExercises: 1, totalExercises: 2,
        coachFeedback: 'Nhận xét cho An', exercises: [{ id: 1, name: 'Bài 1', completed: true, memberResult: 'Kết quả của An', trainingDate: '2026-11-01' }] },
      { memberId: 3, memberName: 'Bình', enrolled: false, unread: true, completedExercises: 0, totalExercises: 2,
        exercises: [{ id: 1, name: 'Bài 1', completed: false, memberResult: '', trainingDate: '2026-11-01' }] },
    ] }
  const coachCard = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Cards, { plans: [plan], audience: 'coach' })))
  assert.match(coachCard, /Cả lớp/); assert.match(coachCard, /2 học viên đã nhận/); assert.match(coachCard, /1\/4 lượt bài/)
  assert.match(coachCard, /\/coach\/training-plans\/10/)
  const memberCard = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Cards, { plans: [{ ...plan, totalExercises: 2 }], audience: 'member' })))
  assert.match(memberCard, /1\/2 bài/); assert.doesNotMatch(memberCard, /Kết quả của An|Nhận xét cho An|Bình/)
  const renderRecipients = (value) => renderToStaticMarkup(createElement(Recipients, { plan: value, busy: false, onAdd() {}, onReview() {} }))
  const roster = renderRecipients(plan)
  assert.match(roster, /Kết quả của An/); assert.match(roster, /Nhận xét cho An/)
  assert.match(roster, /Chỉ xem lịch sử/); assert.match(roster, /Bổ sung 1 học viên/)
  assert.doesNotMatch(roster, /1\/11\/2026|Ngày tập/)
  assert.equal((roster.match(/<details/g) || []).length, 2)
  const completed = renderRecipients({ ...plan, status: 'COMPLETED', editable: false })
  assert.doesNotMatch(completed, /<textarea|Bổ sung 1 học viên|Lưu nhận xét học viên/)
  assert.match(completed, /Kết quả của An/)
  console.log('PASS: class plan cards, aggregate vs personal progress, per-student review, late enrollment, departed member history and read-only completion')
} finally { await server.close() }
