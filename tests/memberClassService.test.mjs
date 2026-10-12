import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
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

  payload = { success: true, classId: 4, packageOption: { eligible: true } }
  assert.deepEqual(await service.getClassConfirmation(4), payload)
  assert.equal(lastRequest.url, '/api/member/classes/4/confirm')

  const request = { paymentMethod: 'DIRECT', paymentChannel: 'Bank_Transfer' }
  payload = { success: true, bookingId: 10 }
  assert.deepEqual(await service.registerForClass(4, request), payload)
  assert.equal(lastRequest.method, 'post')
  assert.equal(lastRequest.url, '/api/member/classes/4/register')
  assert.deepEqual(JSON.parse(lastRequest.data), request)

  payload = { success: false, message: 'No payment option available' }
  await assert.rejects(service.getClassConfirmation(4), /No payment option available/)
  console.log('PASS: member class listing, confirmation, registration and booking API contracts')
} finally {
  delete globalThis.localStorage
  await server.close()
}
