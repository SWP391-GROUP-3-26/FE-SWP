import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import nativeReact from './ssrDependencies.mjs'

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', plugins: [nativeReact] })
try {
  const { default: Card } = await server.ssrLoadModule('/src/components/MemberSessionCard.jsx')
  const entry = { item: { sessionId: 20, className: 'Bơi', attendanceStatus: 'Present', sessionStatus: 'Completed' },
    date: '2026-11-01', startTime: '07:00', endTime: '09:15', reasons: [] }
  const renderCard = (onViewEvaluation) => renderToStaticMarkup(createElement(Card, { entry, onViewEvaluation }))
  assert.doesNotMatch(renderCard(), /Xem đánh giá/)
  const enabled = renderCard(() => {})
  assert.match(enabled, /class="member-view-evaluation"/)
  assert.match(enabled, /type="button"/)
  assert.match(enabled, /Xem đánh giá/)
  assert.match(enabled, /Có mặt/)
  const { default: Details } = await server.ssrLoadModule('/src/components/SessionEvaluationDetails.jsx')
  const detail = renderToStaticMarkup(createElement(Details, { evaluation: { sessionDate: '2026-11-01', startTime: '07:00:00',
    endTime: '09:15:00', coachName: 'Coach', trainingContent: 'Bơi tự do', result: '200m', progressStatus: 'IMPROVING',
    coachFeedback: '<script>alert(1)</script>', nextSteps: 'Tập nhịp thở' } }))
  for (const expected of ['Bơi tự do', '200m', 'Tiến bộ', 'Tập nhịp thở', '07:00–09:15']) assert.ok(detail.includes(expected))
  assert.doesNotMatch(detail, /<script>/)
  assert.match(detail, /&lt;script&gt;/)
  const { default: Modal } = await server.ssrLoadModule('/src/components/MemberSessionEvaluation.jsx')
  const modal = renderToStaticMarkup(createElement(Modal, { sessionId: 20, onClose() {} }))
  assert.match(modal, /<dialog/); assert.match(modal, /aria-labelledby="member-session-evaluation-title"/)
  assert.match(modal, /Đóng đánh giá/); assert.match(modal, /Đang tải đánh giá/)
  console.log('PASS: small evaluation button, absent button without published review, existing attendance, evaluation content, escaped text and accessible loading dialog')
} finally { await server.close() }
