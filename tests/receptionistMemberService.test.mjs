import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const storage = new Map([
  ['accessToken', 'receptionist-token'], ['userId', '7'], ['role', 'Receptionist'],
  ['fullName', 'Tiếp tân kiểm thử'], ['username', 'staff'], ['email', 'staff@example.com'], ['status', 'Active'],
])
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: () => assert.fail('Creating a member must not change auth storage'),
  removeItem: () => assert.fail('Creating a member must not clear auth storage'),
}
try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const service = await server.ssrLoadModule('/src/services/receptionistMemberService.js')
  const { getAuth } = await server.ssrLoadModule('/src/auth/authStorage.js')
  const { isAllowedRole, ROLES } = await server.ssrLoadModule('/src/auth/roleConfig.js')
  const before = getAuth()
  const payload = {
    username: 'new.member', fullName: 'Nguyễn Văn An', email: 'new@example.com',
    phone: '0901234567', password: 'Password1!', confirmPassword: 'Password1!',
  }
  const member = { userId: 42, ...payload, role: 'Member', status: 'Active' }
  delete member.password
  delete member.confirmPassword
  let lastRequest
  let requests = 0
  let failure
  let responseStatus = 201
  let responseBody = { success: true, message: 'Dang ky tai khoan thanh cong', data: member }
  client.defaults.adapter = async (config) => {
    requests += 1
    lastRequest = config
    if (failure) throw failure
    return { data: responseBody, status: responseStatus, statusText: 'OK', headers: {}, config }
  }
  assert.deepEqual(await service.createReceptionistMember({ ...payload, role: 'Coach', roleId: 1, status: 'Inactive', dob: '2000-01-01' }), member)
  assert.equal(lastRequest.url, '/api/receptionist/members')
  assert.equal(lastRequest.method, 'post')
  assert.equal(lastRequest.headers.Authorization, 'Bearer receptionist-token')
  assert.equal(lastRequest.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(lastRequest.data), payload)
  assert.deepEqual(getAuth(), before)

  for (const [field, message] of [['username', 'Username da ton tai'], ['email', 'Email da ton tai'], ['phone', 'Phone da ton tai']]) {
    failure = { response: { status: 409, data: { message } } }
    const previousRequests = requests
    await assert.rejects(service.createReceptionistMember(payload), (error) => error === failure)
    assert.equal(requests, previousRequests + 1, 'POST must not retry automatically')
    assert.equal(service.receptionistMemberError(failure).field, field)
    assert.deepEqual(getAuth(), before)
  }
  for (const [message, field] of [
    ['Username khong hop le', 'username'], ['Full name khong hop le', 'fullName'],
    ['Email khong hop le', 'email'], ['So dien thoai khong hop le', 'phone'],
    ['Password khong hop le', 'password'], ['Confirm password khong khop', 'confirmPassword'],
  ]) assert.equal(service.receptionistMemberError({ response: { status: 400, data: { message } } }).field, field)
  const unknown = service.receptionistMemberError({ response: { status: 409, data: { message: 'Thông tin đã tồn tại.' } } })
  assert.equal(unknown.message, 'Thông tin đã tồn tại.')
  assert.equal(unknown.field, undefined)
  assert.equal(service.receptionistMemberError({ response: { status: 400, data: { message: 'constructor' } } }).field, undefined)
  assert.equal(service.receptionistMemberError({ response: { status: 400 } }).field, undefined)
  assert.equal(service.receptionistMemberError({ response: { status: 400, data: { message: 'Email is required' } } }).field, 'email')
  assert.equal(service.receptionistMemberError({ response: { status: 409, data: { message: 'Du lieu da ton tai' } } }).field, undefined)
  assert.equal(service.receptionistMemberError({ response: { status: 401, data: { message: 'Unauthorized' } } }).requiresLogin, true)
  assert.match(service.receptionistMemberError({ response: { status: 403 } }).message, /không có quyền/)
  assert.match(service.receptionistMemberError({ response: { status: 500, data: { message: 'Internal details' } } }).message, /Máy chủ/)
  assert.match(service.receptionistMemberError({ request: {} }).message, /kết nối/)
  failure = undefined
  responseBody = { success: true, data: null }
  await assert.rejects(service.createReceptionistMember(payload), /Chưa xác nhận/)

  responseStatus = 200
  const profile = {
    ...member, dob: '2000-01-02', gender: null, address: null, avatarUrl: null, status: 'Inactive',
  }
  const list = { success: true, message: 'Tim hoc vien thanh cong', total: 41, page: 1, size: 20, data: [profile] }
  responseBody = list
  const controller = new AbortController()
  assert.deepEqual(await service.searchReceptionistMembers({ keyword: '  Nguyễn  An +84 (90)  ', page: 1, size: 20 }, controller.signal), list)
  assert.equal(lastRequest.method, 'get')
  assert.equal(lastRequest.url, '/api/receptionist/members')
  assert.deepEqual(lastRequest.params, { keyword: 'Nguyễn  An +84 (90)', page: 1, size: 20 })
  assert.equal(lastRequest.headers.Authorization, 'Bearer receptionist-token')
  assert.equal(lastRequest.signal, controller.signal)
  assert.deepEqual(getAuth(), before)
  responseBody = { success: true, total: 0, page: 0, size: 20, data: [] }
  assert.deepEqual((await service.searchReceptionistMembers({ keyword: 'missing' })).data, [])
  assert.deepEqual(lastRequest.params, { keyword: 'missing', page: 0, size: 20 })
  await service.searchReceptionistMembers()
  assert.deepEqual(lastRequest.params, { keyword: '', page: 0, size: 20 })
  responseBody = { success: true, total: 1, page: 5, size: 20, data: [] }
  assert.equal((await service.searchReceptionistMembers({ keyword: 'an', page: 5 })).total, 1)

  for (const invalid of [
    undefined, { ...list, success: false }, { ...list, success: undefined },
    { ...list, data: null }, { ...list, data: {} }, { ...list, data: [null] },
    { ...list, data: [{ ...profile, userId: '42' }] }, { ...list, data: [{ ...profile, role: 'Coach' }] },
    { ...list, data: [{ ...profile, phone: undefined }] }, { ...list, data: [{ ...profile, address: {} }] },
    { ...list, total: undefined }, { ...list, total: -1 }, { ...list, total: '41' }, { ...list, total: 1.5 },
    { ...list, page: -1 }, { ...list, page: '0' }, { ...list, size: 0 }, { ...list, size: 101 }, { ...list, size: '20' },
    { success: true, data: { total: 41, page: 1, size: 20, data: [profile] } },
  ]) {
    responseBody = invalid
    await assert.rejects(service.searchReceptionistMembers({ keyword: 'an' }), /không hợp lệ|Không thể tải/)
  }
  responseBody = { success: true, data: profile }
  assert.deepEqual(await service.getReceptionistMemberById(42, controller.signal), profile)
  assert.equal(lastRequest.url, '/api/receptionist/members/42')
  assert.equal(lastRequest.method, 'get')
  assert.equal(lastRequest.params, undefined)
  assert.equal(lastRequest.headers.Authorization, 'Bearer receptionist-token')
  assert.equal(lastRequest.signal, controller.signal)
  assert.deepEqual(getAuth(), before)
  for (const data of [null, [], {}, { ...profile, userId: 99 }, { ...profile, dob: {} }]) {
    responseBody = { success: true, data }
    await assert.rejects(service.getReceptionistMemberById(42), /không hợp lệ/)
  }
  responseBody = { success: false, data: profile }
  await assert.rejects(service.getReceptionistMemberById(42), /Không thể tải/)
  for (const status of [400, 401, 403, 404, 500]) {
    failure = { response: { status, data: { success: false, message: 'Backend error' } } }
    await assert.rejects(service.searchReceptionistMembers({ keyword: 'an' }), (error) => error === failure)
    await assert.rejects(service.getReceptionistMemberById(42), (error) => error === failure)
    assert.deepEqual(getAuth(), before)
  }
  assert.match(service.receptionistMemberReadError({ response: { status: 400 } }).message, /Tham số tìm kiếm/)
  assert.equal(service.receptionistMemberReadError({ response: { status: 401 } }).requiresLogin, true)
  assert.match(service.receptionistMemberReadError({ response: { status: 403 } }).message, /quyền tìm kiếm/)
  assert.match(service.receptionistMemberReadError({ response: { status: 403 } }, 'detail').message, /quyền xem hồ sơ/)
  assert.match(service.receptionistMemberReadError({ response: { status: 404 } }, 'detail').message, /không còn khả dụng/)
  assert.equal(service.receptionistMemberReadError({ response: { status: 500 } }).retryable, true)
  assert.equal(service.receptionistMemberReadError({ request: {} }).retryable, true)
  failure = undefined
  const aborted = new AbortController()
  aborted.abort()
  await assert.rejects(service.searchReceptionistMembers({ keyword: 'an' }, aborted.signal), (error) => error.code === 'ERR_CANCELED')
  responseStatus = 201
  responseBody = { success: true, data: member }
  assert.deepEqual(await service.createReceptionistMember(payload), member)
  assert.deepEqual(getAuth(), before)
  console.log('PASS: Member reads use params, pagination metadata, selected userId, null fields, cancellation, response validation and unchanged auth; creation still works')
  storage.delete('accessToken')
  const previousRequests = requests
  await assert.rejects(service.createReceptionistMember(payload), (error) => error.response.status === 401)
  assert.equal(requests, previousRequests)
  await assert.rejects(service.searchReceptionistMembers({ keyword: 'an' }), (error) => error.response.status === 401)
  await assert.rejects(service.getReceptionistMemberById(42), (error) => error.response.status === 401)
  assert.equal(requests, previousRequests)
  for (const role of Object.values(ROLES)) {
    assert.equal(isAllowedRole(role, [ROLES.RECEPTIONIST]), role === ROLES.RECEPTIONIST)
  }
  console.log('PASS: Receptionist endpoint, exact payload, bearer token, response, errors, no POST retry and unchanged auth session')
} finally {
  delete globalThis.localStorage
  await server.close()
}
