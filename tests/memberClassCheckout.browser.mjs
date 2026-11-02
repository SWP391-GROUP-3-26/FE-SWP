import assert from 'node:assert/strict'
import { createServer } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5179, strictPort: true, hmr: false } })
await server.listen()
let browser
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  for (const [eligible, channel] of [[true, 'Card'], [true, 'E_Wallet'], [true, 'PACKAGE'], [false, 'Card']]) {
    const context = await browser.newContext()
    const errors = [], posts = []
    await context.addInitScript(() => {
      for (const [key, value] of Object.entries({ accessToken: 'test-only', userId: '7', role: 'Member', fullName: 'Test Member', status: 'Active' })) localStorage.setItem(key, value)
    })
    await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }))
    await context.route('https://sandbox.vnpayment.vn/**', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>VNPay test gateway</h1>' }))
    await context.route('http://localhost:8080/api/**', async (route) => {
      const request = route.request(), path = new URL(request.url()).pathname
      const headers = { 'access-control-allow-origin': 'http://127.0.0.1:5179', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      let body = { success: true }
      if (path.endsWith('/users/me')) body.data = { fullName: 'Test Member', status: 'Active' }
      else if (path.endsWith('/my-classes')) body = { success: true, classes: [], counts: {} }
      else if (path.endsWith('/available')) body.classes = [{ classId: 10, name: 'Yoga Checkout', price: 100000, canRegister: true, remainingSlots: 5 }]
      else if (path.endsWith('/confirm')) body = { success: true, classId: 10, className: 'Yoga Checkout', sessionCount: 3,
        price: 100000, totalAmount: 300000, startDate: '2026-10-30', endDate: '2026-11-30',
        packageOption: { eligible, title: 'Trừ gói hội viên', requiredSessions: 3, remainingSessions: 10, packageName: 'Basic' },
        directPaymentOption: { available: true, title: 'Thanh toán trực tiếp', amount: 300000, amountFormatted: '300.000 đ' } }
      else if (path.endsWith('/register')) {
        posts.push(request.postDataJSON())
        body = { success: true, message: 'Đã đăng ký bằng gói', paymentId: 105, paymentStatus: 'Pending',
          paymentUrl: channel === 'Card' ? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=105' : null }
      } else if (path === '/api/member/payments/105') body = { success: true, paymentId: 105, paymentStatus: 'Pending', paymentAmount: 300000,
        bookingStatus: 'Chờ thanh toán', requiresReview: false, expiresAt: '2099-01-01T00:00:00+07:00' }
      else return route.fulfill({ status: 404, headers, json: { success: false, message: `Unexpected test request ${path}` } })
      return route.fulfill({ headers, json: body })
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('http://127.0.0.1:5179/member/classes')
    await page.getByRole('button', { name: 'Đăng ký lớp', exact: false }).first().click()
    await page.locator('.member-class-card').getByRole('button', { name: 'Đăng ký lớp', exact: true }).click()
    const modal = page.getByRole('dialog')
    await modal.getByRole('radio', { name: /Thanh toán trực tiếp/ }).waitFor()
    if (eligible) {
      assert.equal(await modal.getByRole('radio', { name: /Trừ gói hội viên/ }).isChecked(), true)
      await modal.getByText('0 ₫ thêm', { exact: true }).waitFor()
    }
    if (channel !== 'PACKAGE') {
      await modal.getByRole('radio', { name: /Thanh toán trực tiếp/ }).check()
      const channels = modal.getByRole('combobox', { name: /Kênh thanh toán/ })
      await channels.selectOption(channel)
      assert.deepEqual(await channels.locator('option').evaluateAll((options) => options.map((o) => o.value)), ['Card', 'E_Wallet'])
      assert.equal(await modal.getByText('0 ₫ thêm', { exact: true }).count(), 0, 'Online choice must display its actual fee')
      await modal.getByText('Học phí trực tiếp:', { exact: true }).waitFor()
    }
    await modal.getByRole('button', { name: 'Xác nhận đăng ký', exact: true }).click()
    if (channel === 'Card') await page.waitForURL('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html**')
    else if (channel === 'E_Wallet') await page.waitForURL('**/member/payment-result?paymentId=105')
    else {
      await page.getByText('Đã đăng ký bằng gói', { exact: false }).waitFor()
      assert.equal(new URL(page.url()).pathname, '/member/classes')
    }
    assert.deepEqual(posts, [channel === 'PACKAGE' ? { paymentMethod: 'PACKAGE' } : { paymentMethod: 'DIRECT', paymentChannel: channel }])
    assert.deepEqual(errors, [])
    await context.close()
  }
  console.log('Member class checkout passed: eligible package retains online VNPay/QR choices, correct fees and payloads, package registration and checkout without a package.')
} finally {
  await browser?.close()
  await server.close()
}
