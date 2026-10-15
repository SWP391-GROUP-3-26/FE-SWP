import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
globalThis.localStorage = {
  getItem: (key) => (key === 'accessToken' ? 'member-test-token' : null),
}

try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const {
    getMemberPackageCatalog,
    getMyMemberPackageSubscriptions,
    registerMemberPackage,
  } = await server.ssrLoadModule('/src/services/memberPackageService.js')
  const { default: MemberPackages } = await server.ssrLoadModule('/src/pages/MemberPackages.jsx')

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

  body = { success: true, message: 'registered', data: { subscriptionId: 12 } }
  assert.deepEqual(await registerMemberPackage({ packageId: 3, paymentMethod: 'Cash' }), body)
  assert.equal(lastRequest.url, '/api/member/packages/register')
  assert.equal(lastRequest.method, 'post')
  assert.deepEqual(JSON.parse(lastRequest.data), { packageId: 3, paymentMethod: 'Cash' })

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
  await assert.rejects(registerMemberPackage({ packageId: 3, paymentMethod: 'Cash' }))

  const page = renderToStaticMarkup(createElement(
    MemoryRouter,
    {},
    createElement(MemberPackages),
  ))
  assert.ok(page.includes('Gói dịch vụ đang mở bán'))
  assert.ok(page.includes('Gói tập của tôi'))
  assert.ok(!page.includes('Backend chưa có API'))
  console.log('PASS: member package catalog, subscriptions, registration and response validation')
} finally {
  delete globalThis.localStorage
  await server.close()
}
