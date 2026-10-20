import assert from 'node:assert/strict'
import { mock } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import nativeReact from './ssrDependencies.mjs'

// Exercise the hook's setup/cleanup with controlled state and Node's fake clock.
const hooks = {
  state: [], cursor: 0, effect: null,
  useState(initial) {
    const index = this.cursor++
    if (!(index in this.state)) this.state[index] = initial
    return [this.state[index], (value) => {
      this.state[index] = typeof value === 'function' ? value(this.state[index]) : value
    }]
  },
}
globalThis.__paymentTestHooks = hooks
const server = await createServer({
  server: { middlewareMode: true, hmr: false }, appType: 'custom',
  resolve: { alias: { axios: fileURLToPath(new URL('../node_modules/axios/dist/esm/axios.js', import.meta.url)) } },
  plugins: [nativeReact, {
    name: 'payment-hook-test', enforce: 'pre',
    transform(code, id) {
      if (['/src/hooks/useMemberPayment.js', '/src/pages/MemberClasses.jsx'].some((file) => id.replaceAll('\\', '/').endsWith(file))) {
        const transformed = code.replace("from 'react'", "from 'virtual:payment-test-hooks'")
        return id.replaceAll('\\', '/').endsWith('/src/pages/MemberClasses.jsx')
          ? transformed.replace("from 'react-router-dom'", "from 'virtual:payment-test-router'") : transformed
      }
    },
    resolveId(source) {
      if (source === 'virtual:payment-test-hooks') return '\0payment-test-hooks'
      if (source === 'virtual:payment-test-router') return '\0payment-test-router'
    },
    load(id) {
      if (id === '\0payment-test-router') return `
        export const Link = globalThis.__ssrTestDependencies['react-router-dom'].Link;
        export const useNavigate = () => (url) => { globalThis.__paymentTestHooks.navigation = url; };
      `
      if (id === '\0payment-test-hooks') return `
        export const useState = (initial) => globalThis.__paymentTestHooks.useState(initial);
        export const useEffect = (effect) => { globalThis.__paymentTestHooks.effect = effect; };
        export const useRef = (initial) => ({ current: initial });
      `
    },
  }],
})
const storage = new Map([['accessToken', 'unit-test-token'], ['role', 'Member']])
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  removeItem: (key) => storage.delete(key),
}

try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const service = await server.ssrLoadModule('/src/services/memberPaymentService.js')
  const { registerForClass } = await server.ssrLoadModule('/src/services/memberClassService.js')
  const { default: useMemberPayment } = await server.ssrLoadModule('/src/hooks/useMemberPayment.js')
  const { default: PaymentPage } = await server.ssrLoadModule('/src/pages/MemberPaymentResult.jsx')
  const { default: ClassesPage } = await server.ssrLoadModule('/src/pages/MemberClasses.jsx')
  const { default: ProtectedRoute } = await server.ssrLoadModule('/src/components/ProtectedRoute.jsx')
  const App = (await server.transformRequest('/src/App.jsx')).code
  assert.match(App, /path: "\/member\/payment-result"[\s\S]*?allowedRoles: \[ROLES.MEMBER\]/)

  let requests = []
  let payload = {
    success: true, paymentId: 105, bookingId: 10, paymentStatus: 'Pending',
    bookingStatus: 'Chờ thanh toán', paymentAmount: 250000, requiresReview: false,
    expiresAt: '2026-10-13T15:00:00+07:00',
  }
  let responseError
  let resolveRequest
  client.defaults.adapter = async (config) => {
    requests.push(config)
    if (responseError) throw responseError
    if (resolveRequest === 'hold') await new Promise((resolve) => { resolveRequest = resolve })
    return { data: { ...payload }, status: 200, statusText: 'OK', headers: {}, config }
  }

  for (const id of [null, '', '0', '-1', '01', '1.2', '1e3', '2147483648', '105/other']) {
    assert.equal(service.isValidPaymentId(id), false)
    await assert.rejects(service.getMemberPayment(id))
  }
  assert.equal(requests.length, 0)
  for (const id of ['1', '105', '2147483647']) assert.equal(service.isValidPaymentId(id), true)
  const url = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=105'
  assert.equal(service.getVnpayPaymentUrl(url), url)
  for (const invalid of [null, 'javascript:alert(1)', '/payment', url.replace('https:', 'http:'),
    url.replace('sandbox.vnpayment.vn', 'sandbox.vnpayment.vn.evil.test'),
    url.replace('https://', 'https://user:pass@'), url.replace('/paymentv2/vpcpay.html', '/other')]) {
    assert.throws(() => service.getVnpayPaymentUrl(invalid))
  }

  const controller = new AbortController()
  assert.deepEqual(await service.getMemberPayment('105', { signal: controller.signal }), payload)
  assert.equal(requests.at(-1).url, '/api/member/payments/105')
  assert.equal(requests.at(-1).headers.Authorization, 'Bearer unit-test-token')

  assert.equal(requests.at(-1).signal, controller.signal)
  const qrPayment = {
    qrUrl: 'https://vietqr.app/img?acc=0123456789&bank=MBBank&amount=250000&des=SWP105&template=compact',
    bankCode: 'MBBank', accountNumber: '0123456789', accountName: 'NGUYEN VAN TEST', paymentCode: 'SWP105', testMode: true,
  }
  assert.equal(service.getSepayQrUrl(qrPayment.qrUrl), qrPayment.qrUrl)
  for (const invalid of ['javascript:alert(1)', 'https://vietqr.app.evil.test/img', 'http://vietqr.app/img', 'https://vietqr.app/other']) {
    assert.throws(() => service.getSepayQrUrl(invalid))
  }
  payload.qrPayment = qrPayment
  assert.deepEqual((await service.getMemberPayment('105')).qrPayment, qrPayment)
  for (const invalid of [{ ...qrPayment, testMode: 'true' }, { ...qrPayment, paymentCode: 'SWP106' },
    { ...qrPayment, qrUrl: 'javascript:alert(1)' }]) {
    payload.qrPayment = invalid
    await assert.rejects(service.getMemberPayment('105'))
  }
  delete payload.qrPayment
  for (const status of ['Paid', 'Failed']) {
    payload.paymentStatus = status
    assert.equal((await service.getMemberPayment('105')).paymentStatus, status)
  }
  const payment = { ...payload, paymentStatus: 'Pending' }
  for (const invalid of [{ data: payment }, { ...payment, paymentStatus: 'Unknown' },
    { ...payment, paymentId: 106 }, { ...payment, paymentAmount: '250000' },
    { ...payment, requiresReview: undefined }]) {
    payload = invalid
    await assert.rejects(service.getMemberPayment('105'))
  }
  payload = { ...payment, paymentUrl: url }
  await registerForClass(4, { paymentMethod: 'DIRECT', paymentChannel: 'Card' })
  assert.equal(requests.at(-1).url, '/api/member/classes/4/register')
  assert.deepEqual(JSON.parse(requests.at(-1).data), { paymentMethod: 'DIRECT', paymentChannel: 'Card' })
  assert.equal(requests.at(-1).headers.Authorization, 'Bearer unit-test-token')

  function findRegistrationForm(node) {
    if (!node || typeof node !== 'object') return null
    if (node.type === 'form' && node.props['aria-busy'] !== undefined) return node
    return [node.props?.children].flat(Infinity).map(findRegistrationForm).find(Boolean)
  }
  function nodes(node) {
    if (!node || typeof node !== 'object') return []
    return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
  }
  hooks.state = []
  hooks.cursor = 0
  const registeredClassPage = ClassesPage()
  const headingAction = nodes(registeredClassPage).find((node) => node.type === 'button'
    && node.props.className?.includes('member-class-heading-action'))
  headingAction.props.onClick()
  hooks.cursor = 0
  const availableClassPage = ClassesPage()
  assert.equal(hooks.state[1], 'available')
  assert.equal(nodes(availableClassPage).filter((node) => node.type === 'button'
    && node.props['aria-pressed'] !== undefined).length, 0)
  hooks.state = []
  hooks.cursor = 0
  ClassesPage()
  assert.equal(hooks.state[20], 'Card', 'Default to ATM via VNPay')
  let redirectedTo
  globalThis.window = { location: { assign: (value) => { redirectedTo = value } } }
  for (const paymentUrl of [url, null, 'javascript:alert(1)']) {
    hooks.state = [[], 'registered', [], {}, 'all', null, null, '', null, '', '', false, '', 0, { classId: 4, name: 'Yoga' },
      { className: 'Yoga', directPaymentOption: { available: true } }, false, false, '', 'DIRECT', 'Card', '']
    hooks.cursor = 0
    redirectedTo = null
    payload = { ...payment, paymentUrl, message: 'Đã tạo yêu cầu thanh toán VNPay' }
    await findRegistrationForm(ClassesPage()).props.onSubmit({ preventDefault() {} })
    assert.deepEqual(JSON.parse(requests.at(-1).data), { paymentMethod: 'DIRECT', paymentChannel: 'Card' })
    assert.equal(hooks.state[21], '', 'Creating a card payment must never announce registration success')
    assert.notEqual(hooks.state[14], null, 'Card creation must not follow the completed booking branch')
    if (paymentUrl === url) assert.equal(redirectedTo, url)
    else {
      assert.equal(redirectedTo, null)
      assert.ok(hooks.state[18], 'A missing or unsafe payment URL must show an error')
    }
  }
  hooks.state = [[], 'registered', [], {}, 'all', null, null, '', null, '', '', false, '', 0, { classId: 4, name: 'Yoga' },
    { className: 'Yoga', directPaymentOption: { available: true } }, false, false, '', 'DIRECT', 'Card', '']
  hooks.cursor = 0
  const channel = nodes(ClassesPage()).find((node) => node.type === 'select' && node.props.value === 'Card')
  assert.deepEqual(nodes(channel).filter((node) => node.type === 'option').map((node) =>
    [node.props.value, node.props.children]), [['Card', 'Thẻ ATM qua VNPay'], ['E_Wallet', 'Ví điện tử']])
  channel.props.onChange({ target: { value: 'E_Wallet' } })
  hooks.cursor = 0
  redirectedTo = null
  payload = { ...payment, message: 'Đã tạo yêu cầu thanh toán QR SePay' }
  await findRegistrationForm(ClassesPage()).props.onSubmit({ preventDefault() {} })
  assert.deepEqual(JSON.parse(requests.at(-1).data), { paymentMethod: 'DIRECT', paymentChannel: 'E_Wallet' })
  assert.equal(redirectedTo, '/member/payment-result?paymentId=105', 'Wallet opens QR checkout without announcing success')
  assert.equal(hooks.state[21], '')
  assert.notEqual(hooks.state[14], null)

  hooks.state[0] = [{ classId: 4, name: 'Yoga', canRegister: true }]
  hooks.state[1] = 'available'
  hooks.cursor = 0
  payload = { success: true, className: 'Yoga', directPaymentOption: { available: true } }
  const registerButton = nodes(ClassesPage()).find((node) => node.type === 'button'
    && node.props['aria-pressed'] === undefined && node.props.children === 'Đăng ký lớp')
  await registerButton.props.onClick()
  assert.equal(hooks.state[20], 'Card', 'Reopening the form resets the channel to ATM via VNPay')

  for (const success of [true, false]) {
    hooks.state = [[], 'registered', [], {}, 'all', null, null, '', null, '', '', false, '', 0, { classId: 4, name: 'Yoga' },
      { className: 'Yoga', packageOption: { eligible: true, remainingSessions: 3 } },
      false, false, '', 'PACKAGE', 'Card', '']
    hooks.cursor = 0
    redirectedTo = null
    payload = {
      success, message: success ? 'Đăng ký lớp học thành công!' : 'Gói đã hết buổi',
      paymentId: null, paymentStatus: null, paymentUrl: null, expiresAt: null,
      bookingStatus: success ? 'Đang diễn ra' : null,
      remainingPackageSessions: success ? 2 : null,
    }
    await findRegistrationForm(ClassesPage()).props.onSubmit({ preventDefault() {} })
    assert.deepEqual(JSON.parse(requests.at(-1).data), { paymentMethod: 'PACKAGE' })
    assert.equal(redirectedTo, null, 'PACKAGE must never redirect to VNPay')
    assert.equal(hooks.state[17], false)
    if (success) {
      assert.equal(hooks.state[21], payload.message)
      assert.equal(hooks.state[14], null)
      assert.equal(hooks.state[15], null)
      assert.equal(hooks.state[13], 1, 'Refresh classes after a successful package booking')
    } else {
      assert.equal(hooks.state[21], '')
      assert.equal(hooks.state[18], payload.message)
      assert.notEqual(hooks.state[14], null, 'Keep the modal open on a package booking error')
      assert.equal(hooks.state[13], 0)
    }
  }
  delete globalThis.window

  const read = (id = '105', enabled = true) => {
    hooks.cursor = 0
    return useMemberPayment(id, enabled)
  }
  const reset = () => { hooks.state = []; requests = []; payload = { ...payment }; responseError = null; resolveRequest = null }
  const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }
  const advance = async (ms) => { mock.timers.tick(ms); await flush() }
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 })

  reset()
  read()
  hooks.effect()() // StrictMode's discarded setup must not start a request.
  const cleanup = hooks.effect()
  await advance(0)
  assert.equal(requests.length, 1)
  for (let i = 0; i < 19; i++) await advance(3000)
  assert.equal(requests.length, 20)
  await advance(3000)
  assert.equal(read().timedOut, true)
  assert.equal(read().payment.paymentStatus, 'Pending')
  await advance(60000)
  assert.equal(requests.length, 20)
  read().retry()
  cleanup()
  read()
  payload.paymentStatus = 'Paid'
  const cleanupRetry = hooks.effect()
  await advance(0)
  assert.equal(read().payment.paymentStatus, 'Paid')
  await advance(60000)
  assert.equal(requests.length, 21)
  cleanupRetry()

  for (const status of ['Paid', 'Failed']) {
    reset()
    payload.paymentStatus = status
    read()
    const stop = hooks.effect()
    await advance(0)
    await advance(60000)
    assert.equal(requests.length, 1)
    assert.equal(read().payment.paymentStatus, status)
    stop()
  }
  reset()
  resolveRequest = 'hold'
  read()
  const stopHeld = hooks.effect()
  await advance(0)
  await advance(3000)
  assert.equal(requests.length, 1, 'No overlapping requests while a request is in flight')
  stopHeld()
  assert.equal(requests[0].signal.aborted, true)
  resolveRequest()
  await flush()
  assert.equal(read().loading, true, 'An unmounted request must not update state')

  for (const status of [401, 403, 404, 503]) {
    reset()
    responseError = { response: { status, data: { message: 'Technical details' } } }
    read()
    const stop = hooks.effect()
    await advance(0)
    assert.equal(read().error.response.status, status)
    await advance(60000)
    assert.equal(requests.length, 1)
    assert.doesNotMatch(service.paymentApiErrorMessage(responseError), /Technical details/)
    stop()
  }
  assert.match(service.paymentApiErrorMessage({ request: {} }), /kết nối/)
  assert.equal(service.paymentApiErrorMessage({ response: { status: 400, data: { message: 'Lớp đã hết chỗ' } } }), 'Lớp đã hết chỗ')
  mock.timers.reset()

  function page(query, result) {
    hooks.state = [0, { paymentId: '105', attempt: 0, ...result }]
    hooks.cursor = 0
    return renderToStaticMarkup(createElement(MemoryRouter, {
      initialEntries: [`/member/payment-result?${query}`],
    }, createElement(PaymentPage)))
  }
  const pendingPage = page('paymentId=105&vnp_ResponseCode=00', { payment })
  assert.match(pendingPage, /Đang chờ xác nhận/)
  assert.doesNotMatch(pendingPage, /Thanh toán và đăng ký thành công|Tới lịch tập/)
  const qrPage = page('paymentId=105', { payment: { ...payment, qrPayment } })
  assert.match(qrPage, /QR thanh toán SWP105/)
  assert.match(qrPage, /không chuyển tiền thật/)
  assert.match(qrPage, /0123456789/)
  assert.match(qrPage, /Mô phỏng chuyển khoản/)
  assert.doesNotMatch(page('paymentId=105', { payment: { ...payment, qrPayment, paymentStatus: 'Paid' } }), /QR thanh toán SWP105/)
  assert.doesNotMatch(page('paymentId=105', { payment: { ...payment, qrPayment, paymentStatus: 'Failed' } }), /QR thanh toán SWP105/)
  assert.match(page('paymentId=105', { payment, timedOut: true }), /Kiểm tra lại/)
  const paid = page('paymentId=105&vnp_ResponseCode=99', {
    payment: { ...payment, paymentStatus: 'Paid', bookingStatus: 'Đang diễn ra' },
  })
  assert.match(paid, /Thanh toán và đăng ký thành công/)
  assert.match(paid, /href="\/member\/schedule"/)
  assert.match(paid, /250\.000/)
  assert.match(page('paymentId=105', { payment: { ...payment, paymentStatus: 'Failed' } }), /Thanh toán không thành công/)
  const review = page('paymentId=105', { payment: { ...payment, paymentStatus: 'Paid', requiresReview: true } })
  assert.match(review, /cần xác nhận đăng ký/)
  assert.doesNotMatch(review, /Thanh toán và đăng ký thành công/)
  for (const query of ['', 'paymentId=0', 'paymentId=105&paymentId=106']) {
    assert.match(page(query, {}), /Đường dẫn thanh toán không hợp lệ/)
  }
  assert.match(page('paymentId=105', { error: { response: { status: 401 } } }), /Đăng nhập lại/)

  const protectedPage = () => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(ProtectedRoute, { allowedRoles: ['Member'] }, createElement('p', null, 'PAYMENT_CONTENT'))))
  assert.match(protectedPage(), /PAYMENT_CONTENT/)
  storage.set('role', 'Coach')
  assert.doesNotMatch(protectedPage(), /PAYMENT_CONTENT/)
  storage.delete('accessToken')
  assert.doesNotMatch(protectedPage(), /PAYMENT_CONTENT/)
  console.log('PASS: VNPay/SePay URL validation, QR checkout, flat API/JWT contract, polling deadline/retry/cleanup, payment UI and Member protection (unit tests)')
} finally {
  mock.timers.reset()
  delete globalThis.__paymentTestHooks
  delete globalThis.localStorage
  delete globalThis.window
  await server.close()
}
