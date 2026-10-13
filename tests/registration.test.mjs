import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { validateRegistration } from '../src/utils/registration.js'

const valid = { username: ' Minh_Anh ', fullName: ' Nguyễn Minh Anh ', email: ' ANH@example.com ', phone: '+84 (912) 345-678', password: 'Password1!', confirmPassword: 'Password1!' }
const { errors, payload } = validateRegistration(valid)
assert.deepEqual(errors, {})
assert.equal(payload.username, 'minh_anh')
assert.equal(payload.email, 'anh@example.com')
assert.equal(payload.phone, '0912345678')
assert.equal(payload.fullName, 'Nguyễn Minh Anh')
for (const field of Object.keys(valid)) {
  assert.ok(validateRegistration({ ...valid, [field]: '' }).errors[field])
}
for (const [field, value] of [['username', 'bad name'], ['username', 'a'.repeat(51)], ['fullName', 'a'.repeat(101)], ['email', 'bad'], ['email', 'a'.repeat(90) + '@example.com'], ['phone', '0123456789'], ['phone', '091234567'], ['password', 'password'], ['password', 'Aa1!' + 'a'.repeat(69)], ['confirmPassword', 'Different1!']]) {
  assert.ok(validateRegistration({ ...valid, [field]: value }).errors[field], field)
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
globalThis.localStorage = { getItem: () => 'test-token' }
try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const { register, registerMember } = await server.ssrLoadModule('/src/services/registrationService.js')
  const { ROLES, isAllowedRole } = await server.ssrLoadModule('/src/auth/roleConfig.js')
  let request
  client.defaults.adapter = async (config) => {
    request = config
    return { data: { success: true, message: 'Created', data: { role: 'Member' } }, status: 201, headers: {}, config }
  }
  await register(payload)
  assert.equal(request.url, '/api/auth/register')
  await registerMember(payload)
  assert.equal(request.url, '/api/receptionist/members')
  assert.equal(request.method, 'post')
  assert.equal(request.headers.Authorization, 'Bearer test-token')
  assert.deepEqual(JSON.parse(request.data), payload)
  assert.equal('role' in JSON.parse(request.data), false)
  for (const role of Object.values(ROLES)) {
    assert.equal(isAllowedRole(role, [ROLES.RECEPTIONIST]), role === ROLES.RECEPTIONIST)
  }
  const failure = { response: { status: 409, data: { success: false, message: 'Username da ton tai' } } }
  client.defaults.adapter = async () => { throw failure }
  await assert.rejects(registerMember(payload), (error) => error === failure)
  console.log('PASS: shared validation, normalization, API contract, token, errors and role allowlist')
} finally {
  delete globalThis.localStorage
  await server.close()
}
