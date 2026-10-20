import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import nativeReact from './ssrDependencies.mjs'

globalThis.localStorage = { getItem: (key) => key === 'accessToken' ? 'test-token' : null }
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom',
  resolve: { alias: { axios: fileURLToPath(new URL('../node_modules/axios/dist/esm/axios.js', import.meta.url)) } },
  plugins: [nativeReact] })
try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const api = await server.ssrLoadModule('/src/services/receptionistRegistrationService.js')
  const payments = await server.ssrLoadModule('/src/services/memberPaymentService.js')
  const calls = []
  let body = { success: true }
  client.defaults.adapter = async (config) => {
    calls.push(config)
    return { data: typeof body === 'function' ? body(config) : body, status: 200, statusText: 'OK', headers: {}, config }
  }
  await api.registerReceptionistClass('7', 11, { paymentMethod: 'PACKAGE' })
  assert.equal(calls.at(-1).url, '/api/receptionist/registrations/members/7/classes')
  assert.deepEqual(JSON.parse(calls.at(-1).data), { classId: 11, paymentMethod: 'PACKAGE' })
  await api.registerReceptionistClass('7', 11, { paymentMethod: 'DIRECT', paymentChannel: 'Cash' })
  assert.equal(JSON.parse(calls.at(-1).data).paymentChannel, 'Cash')
  await api.registerReceptionistPackage('7', { packageId: 1, paymentMethod: 'E_Wallet' })
  assert.equal(calls.at(-1).url, '/api/receptionist/registrations/members/7/packages')
  await api.cancelReceptionistClass('7', 42)
  assert.equal(calls.at(-1).url, '/api/receptionist/registrations/members/7/classes/bookings/42/cancel')
  assert.equal(calls.at(-1).headers.Authorization, 'Bearer test-token')
  await api.cancelReceptionistPayment('7', '100')
  assert.equal(calls.at(-1).url, '/api/receptionist/registrations/members/7/payments/100/cancel')
  const count = calls.length
  assert.throws(() => api.registerReceptionistClass('../2', 11, { paymentMethod: 'PACKAGE' }))
  assert.equal(calls.length, count)

  body = { success: true, classes: [
    { bookingId: 1, className: 'Active Yoga', rawStatus: 'Booked' },
    { bookingId: 2, className: 'Finished Yoga', rawStatus: 'Completed' },
    { bookingId: 3, className: 'Cancelled Yoga', rawStatus: 'Cancelled' },
    { bookingId: 4, className: 'Awaiting payment', rawStatus: 'Pending' },
  ] }
  const activeRegistrations = await api.getReceptionistRegistrations('7', { status: 'ongoing' })
  assert.deepEqual(activeRegistrations.classes.map((item) => item.bookingId), [1])
  assert.equal(calls.at(-1).url, '/api/receptionist/registrations/members/7/classes')
  body = { success: true, classes: [] }
  assert.deepEqual((await api.getReceptionistRegistrations('7', { status: 'ongoing' })).classes, [])

  const checkoutMember = { userId: 7, fullName: 'Selected Member', status: 'Active', activePackages: [], activeClasses: [] }
  const checkoutPackage = { packageId: 27, name: 'Package beyond first page', price: 900000, durationDays: 30, includedClasses: 12 }
  body = (config) => config.url === '/api/receptionist/members/7' ? { success: true, data: checkoutMember }
    : config.url.endsWith('/members/7/packages') ? { success: true, data: [] }
      : { success: true, data: Array.from({ length: 27 }, (_, index) => ({ ...checkoutPackage, packageId: index + 1 })) }
  const checkout = await api.getReceptionistCheckout('7', 'packages', '27')
  assert.equal(checkout.item.id, 27)
  assert.equal(checkout.member.userId, 7)
  assert.equal(checkout.amount, 900000)
  assert.ok(calls.every((call) => call.method === 'get' || call.method === 'post'))
  const beforeInvalidCheckout = calls.length
  for (const [memberId, type, id] of [['../2', 'packages', '27'], ['7', 'unknown', '1'], ['7', 'classes', '../1'], ['7', 'classes', '2147483648']]) {
    await assert.rejects(api.getReceptionistCheckout(memberId, type, id))
  }
  assert.equal(calls.length, beforeInvalidCheckout)
  await assert.rejects(api.getReceptionistCheckout('7', 'packages', '28'), /Không tìm thấy gói/)

  body = { success: true, memberId: 7, memberName: 'Selected Member', classInfo: { name: 'Yoga', pricePerSession: 50000 },
    sessions: [{ sessionId: 31, date: '2026-10-21', startTime: '08:00', endTime: '09:00', availableSeats: 2 }],
    canPayWithPackage: false, canRegister: true, requiredPackageClasses: 1, remainingPackageClasses: 0, directPaymentAmount: 50000 }
  const preview = await api.getReceptionistPreview('7', 11)
  assert.equal(preview.memberId, 7); assert.equal(preview.totalAmount, 50000)
  assert.equal(preview.sessions[0].availableSeats, 2); assert.equal(preview.packageOption.eligible, false)
  body = { success: true, paymentId: 100, paymentStatus: 'Pending', paymentAmount: 50000, bookingStatus: 'Chờ thanh toán', requiresReview: false }
  await payments.getMemberPayment('100', { memberId: '7' })
  assert.equal(calls.at(-1).url, '/api/receptionist/registrations/members/7/payments/100')
  await payments.getMemberPayment('100')
  assert.equal(calls.at(-1).url, '/api/member/payments/100')

  for (const [file, props] of [['MemberClasses', {}], ['MemberPackages', {}], ['MemberPaymentResult', {}],
    ['MemberClasses', { receptionist: true, memberId: '7' }], ['MemberPackages', { receptionist: true, memberId: '7' }],
    ['MemberPaymentResult', { receptionist: true, memberId: '7' }]]) {
    const { default: Page } = await server.ssrLoadModule(`/src/pages/${file}.jsx`)
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Page, props)))
    assert.ok(html.length > 0)
    if (props.receptionist) assert.ok(html.includes('/receptionist/members/7'))
  }
  console.log('Receptionist endpoint ownership, payloads, preview, payment scope and shared-page rendering checks passed.')
} finally { await server.close(); delete globalThis.localStorage }
