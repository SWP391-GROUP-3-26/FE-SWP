import assert from 'node:assert/strict'
import { createServer } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5179, strictPort: true, hmr: false } })
await server.listen()
let browser
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  for (const scenario of ['card', 'qr', 'expired', 'paid', 'paidDuringResume', 'error', 'badUrl', 'expiresOnScreen']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const errors = [], mutations = []
    let paid = false, listReads = 0
    const expiresAt = new Date(Date.now() + (scenario === 'expiresOnScreen' ? 4000 : 7 * 60000)).toISOString()
    await context.addInitScript(() => {
      for (const [key, value] of Object.entries({ accessToken: 'test-only', userId: '7', role: 'Member', fullName: 'Test Member', status: 'Active' })) localStorage.setItem(key, value)
    })
    await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }))
    await context.route('https://sandbox.vnpayment.vn/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>VNPay resumed payment 105</h1>' }))
    await context.route('https://vietqr.app/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>' }))
    await context.route('http://localhost:8080/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname
      const headers = { 'access-control-allow-origin': 'http://127.0.0.1:5179', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      if (request.method() === 'POST') mutations.push(path)
      let body = { success: true }
      if (path.endsWith('/users/me')) body.data = { fullName: 'Test Member', status: 'Active' }
      else if (path.endsWith('/my-classes')) {
        listReads++
        const expired = scenario === 'expired' || (scenario === 'expiresOnScreen' && Date.now() >= Date.parse(expiresAt))
        body = { success: true, counts: {}, classes: [{ registrationId: 42, bookingId: 42, classId: 10,
          className: 'Yoga đang thanh toán', classCode: 'CLS-010', roomName: 'Phòng Yoga',
          rawStatus: expired ? 'Cancelled' : 'Pending', status: expired ? 'Đã hủy' : 'Chờ thanh toán',
          canCancel: !expired, canRebook: expired, paymentId: 105, paymentStatus: expired ? 'Failed' : 'Pending',
          paymentAmount: 100000, heldPackageSessions: expired ? 0 : 9, canResumePayment: !expired,
          paymentExpiresAt: expiresAt }] }
      } else if (path === '/api/member/payments/105' || path === '/api/member/payments/105/resume') {
        const resume = path.endsWith('/resume')
        if (resume && scenario === 'error') return route.fulfill({ status: 503, headers, json: { success: false, message: 'Unavailable' } })
        if (resume && scenario === 'paidDuringResume') paid = true
        const complete = scenario === 'paid' || paid
        body = { success: true, paymentId: 105, paymentAmount: 100000,
          paymentStatus: complete ? 'Paid' : 'Pending', bookingStatus: complete ? 'Đang diễn ra' : 'Chờ thanh toán',
          requiresReview: false, expiresAt, packageSessions: 9, payableSessions: 1,
          paymentMethod: scenario === 'qr' ? 'E_Wallet' : 'Card', canResumePayment: !complete }
        if (scenario === 'qr') body.qrPayment = { testMode: true, bankCode: 'MBBank', accountNumber: '0123456789', accountName: 'TEST', paymentCode: 'SWP105',
          qrUrl: 'https://vietqr.app/img?amount=100000&des=SWP105' }
        if (resume && !complete) body.paymentUrl = scenario === 'badUrl' ? 'https://example.test/fake'
          : 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=105&vnp_Amount=10000000'
      } else return route.fulfill({ status: 404, headers, json: { success: false, message: `Unexpected ${path}` } })
      return route.fulfill({ headers, json: body })
    })
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('http://127.0.0.1:5179/member/classes')
    const resume = page.getByRole('link', { name: 'Tiếp tục thanh toán', exact: true })
    if (scenario === 'expired') {
      await page.getByRole('button', { name: 'Đăng ký lại', exact: true }).waitFor()
      assert.equal(await resume.count(), 0)
    } else if (scenario === 'expiresOnScreen') {
      await resume.waitFor()
      await page.getByRole('button', { name: 'Đăng ký lại', exact: true }).waitFor()
      assert.equal(await resume.count(), 0)
      assert.ok(listReads >= 2)
    } else {
      await page.getByText('Đang giữ: 9 lượt gói', { exact: true }).waitFor()
      assert.match(await resume.getAttribute('href'), /paymentId=105$/)
      await resume.click()
      await page.waitForURL('**/member/payment-result?paymentId=105')
      if (scenario === 'paid') {
        await page.getByText('Thanh toán và đăng ký thành công', { exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Tiếp tục thanh toán VNPay' }).count(), 0)
      } else if (scenario === 'qr') {
        await page.getByText('SWP105', { exact: true }).waitFor()
        assert.equal(await page.locator('img[src*="amount=100000"]').count(), 1)
      } else {
        await page.getByRole('button', { name: 'Tiếp tục thanh toán VNPay', exact: true }).click()
        if (scenario === 'card') await page.waitForURL('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html**')
        else if (scenario === 'paidDuringResume') await page.getByText('Thanh toán và đăng ký thành công', { exact: true }).waitFor()
        else {
          await page.getByRole('alert').waitFor()
          assert.equal(new URL(page.url()).pathname, '/member/payment-result')
        }
      }
    }
    assert.deepEqual(mutations, ['card', 'paidDuringResume', 'error', 'badUrl'].includes(scenario) ? ['/api/member/payments/105/resume'] : [])
    assert.deepEqual(errors, [])
    await context.close()
  }
  console.log('PASS: reopen original payment, VNPay/QR, held quota and deadline, expiry refresh/rebook, paid race, retryable errors and unsafe URL rejection; no new registrations')
} finally {
  await browser?.close()
  await server.close()
}
