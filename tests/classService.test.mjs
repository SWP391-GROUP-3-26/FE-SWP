import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const storage = new Map([['accessToken', 'class-test-token']])
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null }
try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const service = await server.ssrLoadModule('/src/services/classService.js')
  let payload = {
    success: true,
    total: 1,
    data: [{ id: 3, code: 'CLS-003', name: 'Yoga flow', status: 'Active' }],
  }
  let lastRequest
  client.defaults.adapter = async (config) => {
    lastRequest = config
    return { data: payload, status: 200, statusText: 'OK', headers: {}, config }
  }

  const list = await service.getClasses({ search: 'Yoga', status: 'Active' })
  assert.equal(list.data[0].id, 3)
  assert.equal(lastRequest.url, '/api/classes')
  assert.deepEqual(lastRequest.params, { search: 'Yoga', status: 'Active' })
  assert.equal(lastRequest.headers.Authorization, 'Bearer class-test-token')

  payload = {
    success: true,
    data: {
      subjects: [{ id: 1, name: 'Yoga' }],
      coaches: [{ id: 2, fullName: 'Coach' }],
      rooms: [{ id: 4, name: 'Studio' }],
    },
  }
  assert.equal((await service.getClassFormOptions()).rooms[0].id, 4)
  assert.equal(lastRequest.url, '/api/classes/options')

  payload = { success: true, data: { id: 3, name: 'Yoga flow' } }
  assert.equal((await service.getClassById(3)).id, 3)
  assert.equal(lastRequest.url, '/api/classes/3')

  const classData = {
    name: 'Yoga flow',
    subjectId: 1,
    coachId: 2,
    roomId: 4,
    daysOfWeek: ['Thứ 2'],
    startTime: '09:00',
    endTime: '10:00',
    maxCapacity: 12,
    price: 200000,
    status: 'Active',
  }
  await service.createClass(classData)
  assert.equal(lastRequest.method, 'post')
  assert.deepEqual(JSON.parse(lastRequest.data), classData)

  payload = undefined
  await service.deleteClass(3)
  assert.equal(lastRequest.method, 'delete')
  assert.equal(lastRequest.url, '/api/classes/3')

  payload = { success: true, data: {} }
  await assert.rejects(service.getClasses(), /không hợp lệ/)
  payload = { success: false, message: 'Schedule conflict' }
  await assert.rejects(service.createClass(classData), /Schedule conflict/)
  console.log('PASS: Class API routes, query, payload, bearer token and error validation')
} finally {
  delete globalThis.localStorage
  await server.close()
}
