import assert from 'node:assert/strict'
import { createServer } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5179, strictPort: true, hmr: false } })
await server.listen()
let browser
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  for (const scenario of ['Card', 'E_Wallet', 'stale', 'failed', 'direct']) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 950 } })
    const posts = [], errors = []
    await context.addInitScript(() => {
      for (const [key, value] of Object.entries({ accessToken: 'test-only', userId: '7', role: 'Member', fullName: 'Test Member', status: 'Active' })) localStorage.setItem(key, value)
    })
    await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }))
    await context.route('https://sandbox.vnpayment.vn/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>VNPay test gateway</h1>' }))
    await context.route('http://localhost:8080/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname
      const headers = { 'access-control-allow-origin': 'http://127.0.0.1:5179', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      let body = { success: true }
      if (path.endsWith('/users/me')) body.data = { fullName: 'Test Member', status: 'Active' }
      else if (path.endsWith('/my-classes')) body = { success: true, classes: [], counts: {} }
      else if (path.endsWith('/available')) body.classes = [{ classId: 10, name: 'Yoga 10 buổi', price: 100000, canRegister: true, remainingSlots: 5 }]
      else if (path.endsWith('/confirm')) body = { success: true, classId: 10, className: 'Yoga 10 buổi', sessionCount: 10,
        price: 100000, totalAmount: 1000000, startDate: '2026-11-10', endDate: '2026-12-10',
        packageOption: { eligible: false, mixedEligible: true, packageSessions: 9, payableSessions: 1, additionalAmount: 100000,
          requiredSessions: 10, remainingSessions: 9, packageName: 'Basic',
          note: 'Lượt được giữ trong khi chờ thanh toán; hết hạn hoặc thất bại sẽ giải phóng lượt.' },
        directPaymentOption: { available: true, title: 'Thanh toán trực tiếp', amount: 1000000, amountFormatted: '1.000.000 đ' } }
      else if (path.endsWith('/register')) {
        posts.push(request.postDataJSON())
        if (scenario === 'stale') return route.fulfill({ status: 409, headers, json: { success: false, message: 'Số lượt hoặc học phí đã thay đổi. Vui lòng mở lại xác nhận đăng ký.' } })
        body = { success: true, paymentId: 105, paymentStatus: 'Pending',
          paymentUrl: ['Card', 'direct'].includes(scenario) ? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=105' : null }
      } else if (path === '/api/member/payments/105') body = { success: true, paymentId: 105,
        paymentStatus: scenario === 'failed' ? 'Failed' : 'Pending', paymentAmount: 100000, packageSessions: 9, payableSessions: 1,
        bookingStatus: scenario === 'failed' ? 'Đã hủy' : 'Chờ thanh toán', requiresReview: false, expiresAt: '2099-01-01T00:00:00+07:00' }
      else return route.fulfill({ status: 404, headers, json: { success: false, message: `Unexpected ${path}` } })
      return route.fulfill({ headers, json: body })
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' && !message.text().includes('409')) errors.push(message.text()) })
    await page.goto('http://127.0.0.1:5179/member/classes')
    await page.getByRole('button', { name: 'Đăng ký lớp', exact: false }).first().click()
    await page.locator('.member-class-card').getByRole('button', { name: 'Đăng ký lớp', exact: true }).click()
    const modal = page.getByRole('dialog')
    assert.equal(await modal.getByRole('radio', { name: /Dùng 9 lượt gói/ }).isChecked(), true)
    assert.match(await modal.locator('.member-mixed-payment-summary').innerText(), /Dùng từ gói:\s*9 lượt/)
    await modal.getByText('100.000', { exact: false }).first().waitFor()
    await modal.getByRole('combobox', { name: /Kênh thanh toán/ }).selectOption(['E_Wallet', 'failed'].includes(scenario) ? 'E_Wallet' : 'Card')
    assert.deepEqual(await modal.locator('select option').evaluateAll(options => options.map(o => o.value)), ['Card', 'E_Wallet'])
    if (scenario === 'Card') await page.screenshot({ path: 'node_modules/.cache/mixed-class-payment.png', fullPage: true })
    if (scenario === 'direct') {
      await modal.getByRole('radio', { name: /Thanh toán trực tiếp/ }).check()
      await modal.getByText('Học phí trực tiếp:', { exact: true }).waitFor()
    }
    await modal.getByRole('button', { name: scenario === 'direct' ? 'Xác nhận đăng ký' : /Thanh toán thêm/ }).click()
    if (scenario === 'stale') {
      await modal.getByRole('alert').filter({ hasText: 'Số lượt hoặc học phí đã thay đổi' }).waitFor()
      assert.equal(new URL(page.url()).pathname, '/member/classes')
    } else if (['Card', 'direct'].includes(scenario)) await page.waitForURL('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html**')
    else {
      await page.waitForURL('**/member/payment-result?paymentId=105')
      await page.getByText(scenario === 'failed' ? 'Lượt gói đã giải phóng' : 'Lượt gói đang giữ', { exact: true }).waitFor()
      await page.getByText('Buổi thanh toán thêm', { exact: true }).waitFor()
    }
    assert.deepEqual(posts, [scenario === 'direct' ? { paymentMethod: 'DIRECT', paymentChannel: 'Card' }
      : { paymentMethod: 'MIXED', paymentChannel: ['E_Wallet', 'failed'].includes(scenario) ? 'E_Wallet' : 'Card', packageSessions: 9, paymentAmount: 100000 }])
    assert.deepEqual(errors, [])
    await context.close()
  }
  console.log('PASS: mixed 9/10 split, supplement only, VNPay/QR navigation, quote conflict, released quota, and full direct-payment fallback')
} finally {
  await browser?.close()
  await server.close()
}
