import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

// Adapter fixtures verify the FE contract only; these are not live API tests.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const storage = new Map([['accessToken', 'test-token'], ['role', 'Receptionist']])
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null }
try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const { searchMembers, getMemberById } = await server.ssrLoadModule('/src/services/memberService.js')
  const { default: ErrorView } = await server.ssrLoadModule('/src/components/MemberRequestError.jsx')
  const { default: ProtectedRoute } = await server.ssrLoadModule('/src/components/ProtectedRoute.jsx')
  const { default: Home } = await server.ssrLoadModule('/src/pages/ReceptionistDashboard.jsx')
  const { staffMenuItems } = await server.ssrLoadModule('/src/components/staffMenuItems.js')
  const { ROLES, getRouteForRole } = await server.ssrLoadModule('/src/auth/roleConfig.js')
  let calls = 0
  let lastRequest
  const member = { userId: 7, fullName: 'Nguyễn  An', username: 'an', email: null, phone: null, role: 'Member', status: 'Active' }
  let payload = { success: true, total: 41, page: 1, size: 20, data: [member] }
  client.defaults.adapter = async (config) => {
    calls++
    lastRequest = config
    return { data: payload, status: 200, headers: {}, config }
  }
  for (const keyword of ['', '   ', '\t\n']) {
    assert.deepEqual(await searchMembers(keyword), { data: [], total: 0, page: 0, size: 20 })
  }
  assert.equal(calls, 0, 'Blank keywords must not call the backend')
  const controller = new AbortController()
  assert.deepEqual(await searchMembers('  Nguyễn  An  ', 1, controller.signal), payload)
  assert.equal(lastRequest.url, '/api/receptionist/members')
  assert.equal(lastRequest.method, 'get')
  assert.deepEqual(lastRequest.params, { keyword: 'Nguyễn  An', page: 1, size: 20 })
  assert.equal(lastRequest.headers.Authorization, 'Bearer test-token')
  assert.equal(lastRequest.signal, controller.signal)
  payload = { success: true, total: 0, page: 0, size: 20, data: [] }
  assert.equal((await searchMembers('missing')).total, 0)
  for (const invalid of [null, {}, { success: true, data: [] }, { success: true, total: 1, page: 0, size: 20, data: [{}] }]) {
    payload = invalid
    await assert.rejects(searchMembers('an'))
  }
  payload = { success: true, data: member }
  assert.deepEqual(await getMemberById(7), member)
  assert.equal(lastRequest.url, '/api/receptionist/members/7')
  await getMemberById('a/b')
  assert.equal(lastRequest.url, '/api/receptionist/members/a%2Fb')
  payload = { success: true, data: {} }
  await assert.rejects(getMemberById(7), /không hợp lệ/)
  payload = { success: false, message: 'Failure' }
  await assert.rejects(getMemberById(7), /Failure/)
  const aborted = new AbortController()
  aborted.abort()
  const previousCalls = calls
  await assert.rejects(searchMembers('an', 0, aborted.signal), (error) => error.code === 'ERR_CANCELED')
  assert.equal(calls, previousCalls)

  const render = (element) => renderToStaticMarkup(createElement(MemoryRouter, {}, element))
  for (const [status, text] of [[401, 'Phiên đăng nhập đã hết hạn'], [403, 'Bạn không có quyền'], [404, 'Không tìm thấy hồ sơ'], [500, 'Server failure']]) {
    const failure = { response: { status, data: { message: 'Server failure' } } }
    client.defaults.adapter = async () => { throw failure }
    await assert.rejects(getMemberById(7), (error) => error === failure)
    const html = render(createElement(ErrorView, { error: failure, retry: () => {}, isDetail: true }))
    assert.ok(html.includes(text))
    assert.equal(html.includes('Thử lại'), status === 500)
    assert.equal(html.includes('href="/login"'), status === 401)
  }
  for (const role of Object.values(ROLES)) {
    storage.set('role', role)
    assert.equal(render(createElement(ProtectedRoute, { allowedRoles: [ROLES.RECEPTIONIST] }, 'protected-content')).includes('protected-content'), role === ROLES.RECEPTIONIST)
  }
  storage.delete('accessToken')
  assert.equal(render(createElement(ProtectedRoute, { allowedRoles: [ROLES.RECEPTIONIST] }, 'protected-content')).includes('protected-content'), false)
  assert.equal(getRouteForRole(ROLES.RECEPTIONIST), '/receptionist')
  assert.deepEqual(staffMenuItems[ROLES.RECEPTIONIST].map((item) => item.label), ['Đăng ký người dùng', 'Tong quan tiep tan', 'Hoi vien', 'Thanh toan'])
  assert.ok(staffMenuItems[ROLES.CENTER_MANAGER].some((item) => item.route === '/subjects'))
  assert.ok(render(createElement(Home)).includes('Nhập từ khóa để tìm học viên.'))
  console.log('PASS: member search/detail contract, blank keywords, trim, pagination, cancellation, errors, initial render, role guard and sidebar')
} finally {
  delete globalThis.localStorage
  await server.close()
}
