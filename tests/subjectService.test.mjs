import assert from 'node:assert/strict'
import { createServer } from 'vite'

// Contract checks use an Axios adapter only in tests; production always calls the backend.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const storage = new Map([['accessToken', 'test-token']])
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null }
try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const service = await server.ssrLoadModule('/src/services/subjectService.js')
  const { ROLES, isAllowedRole } = await server.ssrLoadModule('/src/auth/roleConfig.js')
  let payload = { success: true, total: 1, data: [{ id: 7, code: 'S7', name: 'Yoga', category: 'Fitness', description: '' }] }
  let lastRequest
  client.defaults.adapter = async (config) => {
    lastRequest = config
    return { data: payload, status: 200, statusText: 'OK', headers: {}, config }
  }
  assert.equal((await service.getSubjects()).data[0].id, 7)
  assert.equal(lastRequest.url, '/api/subjects')
  assert.equal(lastRequest.headers.Authorization, 'Bearer test-token')
  payload = { success: true, data: { id: 7, name: 'Yoga' } }
  assert.equal((await service.getSubjectById(7)).name, 'Yoga')
  assert.equal(lastRequest.url, '/api/subjects/7')
  await service.createSubject({ name: 'Yoga', category: 'Fitness', description: '', code: 'ignored' })
  assert.equal(lastRequest.method, 'post')
  assert.deepEqual(JSON.parse(lastRequest.data), { name: 'Yoga', category: 'Fitness', description: '' })
  payload = undefined // DELETE may return 204 without a response body.
  await service.deleteSubject(7)
  assert.equal(lastRequest.method, 'delete')
  assert.equal(lastRequest.url, '/api/subjects/7')
  payload = { success: false, message: 'Subject in use' }
  await assert.rejects(service.deleteSubject(7), /Subject in use/)
  payload = { success: true, data: {} }
  await assert.rejects(service.getSubjects(), /không hợp lệ/)
  const allowed = [ROLES.CENTER_MANAGER, ROLES.RECEPTIONIST]
  assert.equal(isAllowedRole(ROLES.CENTER_MANAGER, allowed), true)
  assert.equal(isAllowedRole(ROLES.RECEPTIONIST, allowed), true)
  assert.equal(isAllowedRole(ROLES.MEMBER, allowed), false)
  assert.equal(isAllowedRole(ROLES.COACH, allowed), false)
  console.log('PASS: Subject API methods, payload, bearer token, error handling and role allowlist')
} finally {
  delete globalThis.localStorage
  await server.close()
}
