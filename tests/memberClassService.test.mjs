import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const server = await createServer({ server: { middlewareMode: true, hmr: false },
  resolve: { alias: { axios: fileURLToPath(new URL('../node_modules/axios/dist/esm/axios.js', import.meta.url)) } }, appType: 'custom' })
const storage = new Map([['accessToken', 'member-class-test-token']])
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null }
try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const service = await server.ssrLoadModule('/src/services/memberClassService.js')
  let payload
  let lastRequest
  client.defaults.adapter = async (config) => {
    lastRequest = config
    return {
      data: payload,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  const availableClass = { classId: 4, classCode: 'CLS-004', canRegister: true }
  payload = { success: true, classes: [availableClass] }
  assert.deepEqual(await service.getAvailableClasses({ search: 'CLS-004' }), [availableClass])
  assert.equal(lastRequest.url, '/api/member/classes/available')
  assert.deepEqual(lastRequest.params, { search: 'CLS-004' })
  assert.equal(lastRequest.headers.Authorization, 'Bearer member-class-test-token')

  payload = { success: true, classes: [{ bookingId: 10, classId: 4, sessions: [{ sessionId: 1 }, { sessionId: 2 }] }], counts: { all: 1 } }
  assert.deepEqual(await service.getMyClassList({ status: 'all', search: 'Yoga' }), { classes: payload.classes, counts: payload.counts })
  assert.deepEqual(lastRequest.params, { status: 'all', search: 'Yoga' })
  payload = { success: true, message: 'Đã hủy' }
  assert.deepEqual(await service.cancelClassRegistration(10), payload)
  assert.equal(lastRequest.url, '/api/member/classes/bookings/10/cancel')
  assert.equal(lastRequest.method, 'post')
  const booking = {
    bookingId: 10,
    classId: 4,
    className: 'Yoga',
    schedule: 'Thứ 2, Thứ 4',
    timeSlot: '09:00 - 10:00',
  }
  payload = { success: true, classes: [booking] }
  assert.deepEqual(await service.getMyClasses(), [booking])
  assert.equal(lastRequest.url, '/api/member/classes/my-classes')
  assert.deepEqual(lastRequest.params, { status: 'ongoing' })
  payload = { success: true, classes: [{ ...booking, startDate: '2026-10-13', durationWeeks: 1,
    endDate: '2026-10-18', sessionId: 100, sessionDate: '2026-10-13',
    sessionStartTime: '07:30', sessionEndTime: '08:45', rawStatus: 'Completed', sessionStatus: 'Completed' }] }
  assert.deepEqual(await service.getMyClasses({ status: 'all' }), payload.classes)
  assert.deepEqual(lastRequest.params, { status: 'all' })
  assert.equal(lastRequest.headers.Authorization, 'Bearer member-class-test-token')

  payload = { success: true, classId: 4, packageOption: { eligible: true } }
  assert.deepEqual(await service.getClassConfirmation(4), payload)
  assert.equal(lastRequest.url, '/api/member/classes/4/confirm')

  payload = { success: true, bookingId: 10 }
  for (const paymentChannel of ['Card', 'E_Wallet']) {
    const request = { paymentMethod: 'DIRECT', paymentChannel }
    assert.deepEqual(await service.registerForClass(4, request), payload)
    assert.equal(lastRequest.method, 'post')
    assert.equal(lastRequest.url, '/api/member/classes/4/register')
    assert.deepEqual(JSON.parse(lastRequest.data), request)
    assert.equal(lastRequest.headers.Authorization, 'Bearer member-class-test-token')
  }
  for (const paymentChannel of ['Cash', 'Bank_Transfer', '', undefined, 'invalid']) {
    lastRequest = null
    await assert.rejects(service.registerForClass(4, { paymentMethod: 'DIRECT', paymentChannel }), /Vui lòng chọn/)
    assert.equal(lastRequest, null, 'Invalid channels must not send a request')
  }

  payload = { success: false, message: 'No payment option available' }
  await assert.rejects(service.getClassConfirmation(4), /No payment option available/)
  console.log('PASS: member class listing, confirmation, registration and booking API contracts')
} finally {
  delete globalThis.localStorage
  await server.close()
}
