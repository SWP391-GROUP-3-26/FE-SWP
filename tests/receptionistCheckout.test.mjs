import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import nativeReact from './ssrDependencies.mjs'

// Control only checkout hooks; API writes use the shared Axios client's test adapter.
const harness = { state: [], cursor: 0, refs: [], refCursor: 0, query: '', navigation: [], redirects: [], request: {}, payment: {} }
globalThis.__checkoutTest = harness
globalThis.localStorage = { getItem: (key) => key === 'accessToken' ? 'checkout-test-token' : null }
globalThis.window = { location: { assign: (url) => harness.redirects.push(url) } }
const server = await createServer({
  server: { middlewareMode: true, hmr: false }, appType: 'custom',
  resolve: { alias: { axios: fileURLToPath(new URL('../node_modules/axios/dist/esm/axios.js', import.meta.url)) } },
  plugins: [nativeReact, {
    name: 'checkout-test-hooks', enforce: 'pre',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/pages/ReceptionistCheckout.jsx')) return
      return code.replace("from 'react'", "from 'virtual:checkout-hooks'")
        .replace("from 'react-router-dom'", "from 'virtual:checkout-router'")
        .replace("from '../hooks/useMemberRequest'", "from 'virtual:checkout-request'")
        .replace("from '../hooks/useMemberPayment'", "from 'virtual:checkout-payment'")
    },
    resolveId(id) { if (id.startsWith('virtual:checkout-')) return '\0' + id },
    load(id) {
      const h = 'globalThis.__checkoutTest'
      if (id === '\0virtual:checkout-hooks') return `
        export const useCallback = (fn) => fn;
        export const useState = (initial) => { const h = ${h}, index = h.cursor++;
          if (!(index in h.state)) h.state[index] = initial;
          return [h.state[index], value => { h.state[index] = typeof value === 'function' ? value(h.state[index]) : value; }]; };
        export const useRef = (initial) => { const h = ${h}, index = h.refCursor++; return h.refs[index] ??= { current: initial }; };
      `
      if (id === '\0virtual:checkout-router') return `
        export const Link = globalThis.__ssrTestDependencies['react-router-dom'].Link;
        export const useParams = () => ({});
        export const useNavigate = () => (...args) => ${h}.navigation.push(args);
        export const useSearchParams = () => [new URLSearchParams(${h}.query)];
      `
      if (id === '\0virtual:checkout-request') return `export default () => ${h}.request;`
      if (id === '\0virtual:checkout-payment') return `export default () => ${h}.payment;`
    },
  }],
})

function find(element, predicate) {
  if (!element || typeof element !== 'object') return null
  if (predicate(element)) return element
  for (const child of [element.props?.children].flat(Infinity)) {
    const result = find(child, predicate)
    if (result) return result
  }
  return null
}
try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const { ReceptionistCheckoutContent: Checkout } = await server.ssrLoadModule('/src/pages/ReceptionistCheckout.jsx')
  const member = { userId: 7, fullName: 'Checkout Member', status: 'Active', activePackages: [], phone: '0900000000', email: 'member@example.test' }
  const preview = { memberId: 7, className: 'Yoga Checkout', classInfo: { classId: 11, availableSeats: 4, subjectName: 'Yoga' },
    canRegister: true, canPayWithPackage: true, packageName: 'Current Package', remainingPackageClasses: 8, requiredPackageClasses: 2,
    price: 50000, totalAmount: 100000, sessionCount: 2, sessions: [{ sessionId: 31, sessionDate: '2026-10-21', sessionStartTime: '08:00', sessionEndTime: '09:00', availableSeats: 4 }], schedule: 'T2 · 08:00–09:00' }
  const pack = { id: 27, name: 'Package Checkout', price: 900000, durationDays: 30, includedClasses: 12, benefits: 'Training benefits', termConditions: 'Package terms' }
  let posts = []
  let response
  client.defaults.adapter = async (config) => {
    posts.push(config)
    return { data: response, status: 201, statusText: 'Created', headers: {}, config }
  }
  function reset(type, method = 'E_Wallet', received = false) {
    harness.state = [method, received, false, '', null]
    harness.refs = []
    harness.query = ''
    harness.navigation = []; harness.redirects = []; posts = []
    harness.payment = {}
    harness.request = { data: { member: { ...member }, item: type === 'classes' ? { ...preview } : pack, subscriptions: [], amount: type === 'classes' ? 100000 : 900000 }, loading: false }
  }
  function tree(type) {
    harness.cursor = 0; harness.refCursor = 0
    return Checkout({ memberId: '7', serviceType: type, serviceId: type === 'classes' ? '11' : '27' })
  }
  const html = (element) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
  const submit = (element) => find(element, (el) => el.type === 'form').props.onSubmit({ preventDefault() {} })
  const submitButton = (element) => find(element, (el) => el.type === 'button' && el.props.type === 'submit')
  for (const type of ['classes', 'packages']) {
    for (const method of ['E_Wallet', 'Card', 'Cash', ...(type === 'classes' ? ['PACKAGE'] : [])]) {
      reset(type, method, method === 'Cash')
      const element = tree(type)
      const markup = html(element)
      for (const label of ['Checkout Member', 'Mã hội viên #7', 'Mã QR', 'Thẻ VNPay', 'Tiền mặt', type === 'classes' ? 'Yoga Checkout' : 'Package Checkout']) assert.ok(markup.includes(label), label)
      assert.ok(!markup.includes('<dialog'))
      assert.equal(posts.length, 0, 'Opening checkout must not create a registration')
      const gateway = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=100'
      response = { success: true, memberId: 7, paymentId: method === 'PACKAGE' ? null : 100,
        paymentStatus: ['Cash'].includes(method) ? 'Paid' : method === 'PACKAGE' ? null : 'Pending', paymentUrl: gateway, message: 'Registration recorded' }
      await Promise.all([submit(element), submit(element)])
      assert.equal(posts.length, 1, 'Double click must send only one registration')
      assert.equal(posts[0].url, `/api/receptionist/registrations/members/7/${type}`)
      assert.deepEqual(JSON.parse(posts[0].data), type === 'packages'
        ? { packageId: 27, paymentMethod: method }
        : method === 'PACKAGE' ? { classId: 11, paymentMethod: 'PACKAGE' } : { classId: 11, paymentMethod: 'DIRECT', paymentChannel: method })
      if (method === 'Card') assert.deepEqual(harness.redirects, [gateway])
      else if (method === 'E_Wallet') assert.equal(harness.navigation[0][0], '?paymentId=100')
      else assert.ok(html(tree(type)).includes('Đăng ký thành công'))
    }
  }
  reset('classes', 'Cash')
  assert.equal(submitButton(tree('classes')).props.disabled, true)
  await submit(tree('classes')); assert.equal(posts.length, 0)
  reset('classes', 'PACKAGE')
  harness.request.data.item.canPayWithPackage = false
  assert.equal(submitButton(tree('classes')).props.disabled, true)
  reset('classes')
  harness.request.data.item.canRegister = false
  harness.request.data.item.message = 'Already registered'
  await submit(tree('classes')); assert.equal(posts.length, 0)
  reset('packages')
  harness.request.data.member.activePackages = [{ subscriptionId: 1 }]
  assert.equal(submitButton(tree('packages')).props.disabled, true)
  reset('packages')
  harness.request.data.subscriptions = [{ subscriptionStatus: 'Pending', paymentStatus: 'Pending', paymentId: 100 }]
  assert.ok(html(tree('packages')).includes('Kiểm tra giao dịch đang chờ'))
  assert.equal(submitButton(tree('packages')).props.disabled, true)
  reset('classes')
  response = { success: true, paymentStatus: 'Pending', paymentId: null }
  await submit(tree('classes'))
  assert.equal(submitButton(tree('classes')).props.disabled, true, 'Do not resubmit a successful POST with an incomplete response')
  reset('classes', 'Card')
  response = { success: true, paymentStatus: 'Pending', paymentId: 100, paymentUrl: 'javascript:alert(1)' }
  await submit(tree('classes'))
  assert.equal(harness.redirects.length, 0)
  assert.ok(html(tree('classes')).includes('Kiểm tra giao dịch #100'))
  assert.equal(submitButton(tree('classes')).props.disabled, true)
  reset('classes')
  const adapter = client.defaults.adapter
  client.defaults.adapter = async () => { throw { response: { status: 409, data: { message: 'Lớp đã hết chỗ' } } } }
  await submit(tree('classes'))
  assert.ok(html(tree('classes')).includes('Lớp đã hết chỗ'))
  assert.equal(harness.state[4], null)
  client.defaults.adapter = adapter
  reset('classes')
  harness.query = 'paymentId=100'
  harness.payment = { loading: false, payment: { paymentStatus: 'Paid', paymentId: 100, itemName: 'Yoga Checkout', paymentAmount: 100000, bookingStatus: 'Đang diễn ra', requiresReview: false } }
  assert.ok(html(tree('classes')).includes('Thanh toán và đăng ký thành công'))
  assert.equal(find(tree('classes'), (el) => el.type === 'form'), null, 'Reloading existing payment must not allow a new POST')
  harness.payment.payment.requiresReview = true
  assert.ok(html(tree('classes')).includes('cần đối soát đăng ký'))
  harness.query = 'paymentId=invalid'
  assert.ok(html(tree('classes')).includes('Mã thanh toán không hợp lệ'))
  console.log('Checkout: class/package payloads, three channels, package eligibility, cash confirmation, duplicate protection, QR resume, and review states passed.')
} finally {
  await server.close()
  delete globalThis.__checkoutTest
  delete globalThis.localStorage
  delete globalThis.window
}
