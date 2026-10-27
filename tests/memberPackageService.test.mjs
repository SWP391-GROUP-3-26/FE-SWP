import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { fileURLToPath } from 'node:url'
import nativeReact from './ssrDependencies.mjs'

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom',
  resolve: { alias: { axios: fileURLToPath(new URL('../node_modules/axios/dist/esm/axios.js', import.meta.url)) } }, plugins: [nativeReact] })
globalThis.localStorage = {
  getItem: (key) => (key === 'accessToken' ? 'member-test-token' : null),
}

try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const {
    getMemberPackageCatalog,
    getMemberPackageDetail,
    getMyMemberPackageSubscriptions,
    registerMemberPackage,
  } = await server.ssrLoadModule('/src/services/memberPackageService.js')
  const { default: MemberPackages } = await server.ssrLoadModule('/src/pages/MemberPackages.jsx')
  const { default: MemberDashboard } = await server.ssrLoadModule('/src/pages/MemberDashboard.jsx')

  let lastRequest
  let body = {
    success: true,
    message: 'ok',
    total: 1,
    page: 0,
    size: 20,
    data: [{ id: 3, name: 'Gói tháng', price: 500000 }],
  }
  client.defaults.adapter = async (config) => {
    lastRequest = config
    return { data: body, status: 200, headers: {}, config }
  }

  const signal = new AbortController().signal
  assert.deepEqual(await getMemberPackageCatalog({ search: '  tháng  ', page: 1, size: 20, signal }), body)
  assert.equal(lastRequest.url, '/api/member/packages')
  assert.deepEqual(lastRequest.params, { search: 'tháng', page: 1, size: 20 })
  assert.equal(lastRequest.headers.Authorization, 'Bearer member-test-token')
  assert.equal(lastRequest.signal, signal)

  body = { success: true, total: 0, page: 0, size: 100, data: [] }
  assert.deepEqual(await getMyMemberPackageSubscriptions(), body)
  assert.equal(lastRequest.url, '/api/member/packages/subscriptions')
  assert.deepEqual(lastRequest.params, { page: 0, size: 100 })

  body = { success: true, message: 'pending', data: { subscriptionId: 12, paymentId: 100, paymentStatus: 'Pending' } }
  assert.deepEqual(await registerMemberPackage({ packageId: 3, paymentMethod: 'Card' }), body)
  assert.equal(lastRequest.url, '/api/member/packages/register')
  assert.equal(lastRequest.method, 'post')
  assert.deepEqual(JSON.parse(lastRequest.data), { packageId: 3, paymentMethod: 'Card' })
  await assert.rejects(registerMemberPackage({ packageId: 3, paymentMethod: 'Cash' }), /chỉ thanh toán/)

  body = { success: true, data: { id: 3, choiceGroups: [{ id: 4, requiredSelection: 1, sports: [{ id: 9, name: 'Yoga' }] }] } }
  assert.deepEqual(await getMemberPackageDetail(3), body.data)
  assert.equal(lastRequest.url, '/api/member/packages/3')
  body = { success: true, data: { id: 4, choiceGroups: [] } }
  await assert.rejects(getMemberPackageDetail(3))

  for (const invalid of [
    null,
    { success: false, data: [] },
    { success: true, data: {} },
    { success: true, total: '1', page: 0, size: 20, data: [] },
  ]) {
    body = invalid
    await assert.rejects(getMemberPackageCatalog())
  }
  body = { success: true, data: null }
  await assert.rejects(registerMemberPackage({ packageId: 3, paymentMethod: 'Card' }))

  const page = renderToStaticMarkup(createElement(
    MemoryRouter,
    {},
    createElement(MemberPackages),
  ))
  assert.ok(page.includes('Gói dịch vụ đang mở bán'))
  assert.ok(page.includes('Gói tập của tôi'))
  assert.ok(!page.includes('Backend chưa có API'))

  const dashboard = renderToStaticMarkup(createElement(
    MemoryRouter,
    {},
    createElement(MemberDashboard),
  ))
  assert.match(dashboard, /Theo dõi gói đang dùng, thời hạn và các gói đang mở bán/)
  assert.doesNotMatch(dashboard, /sẽ hiển thị tại đây|khi được kết nối với hệ thống/)
  assert.doesNotMatch(dashboard, /member-journey-panel|class="notification-button"/)
  console.log('PASS: member package catalog, subscriptions, registration and response validation')
} finally {
  delete globalThis.localStorage
  await server.close()
}
