import assert from 'node:assert/strict'
import { createServer } from 'vite'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5179, strictPort: true, hmr: false } })
await server.listen()
let browser
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  for (const channel of ['Cash', 'Card', 'E_Wallet', 'stale']) {
    const context = await browser.newContext()
    const writes = [], previews = [], errors = []
    let created = false, paid = false
    const current = { subscriptionId: 40, packageId: 3, packageName: 'Premium hiện tại', endDate: '2099-01-01' }
    const pack = { id: 3, name: current.packageName, durationDays: 30, price: 1000000, includedClasses: 10,
      choiceGroups: [{ id: 8, name: 'Môn tự chọn', requiredSelection: 1, sports: [{ id: 5, name: 'Yoga lựa chọn' }] }] }
    const base = '/api/receptionist/registrations/members/7'
    await context.addInitScript(() => {
      for (const [key, value] of Object.entries({ accessToken: 'test-only', userId: '2', role: 'Receptionist', fullName: 'Test Recep', status: 'Active' })) localStorage.setItem(key, value)
    })
    await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }))
    await context.route('https://sandbox.vnpayment.vn/**', r => r.fulfill({ contentType: 'text/html', body: '<h1>VNPay renewal test</h1>' }))
    await context.route('https://vietqr.app/**', r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }))
    await context.route('http://localhost:8080/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname
      const headers = { 'access-control-allow-origin': 'http://127.0.0.1:5179', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      let body = { success: true }
      if (path.endsWith('/users/me')) body.data = { fullName: 'Test Recep', status: 'Active' }
      else if (path === '/api/receptionist/members/7') body.data = { userId: 7, fullName: 'Hội viên gia hạn', status: 'Active',
        email: 'test@example.test', activePackages: [current], activeClasses: [] }
      else if (path === `${base}/classes`) body = { success: true, classes: [], counts: {} }
      else if (path === `${base}/packages`) body.data = created ? [{ subscriptionId: 41, packageId: 3, packageName: pack.name,
        durationDays: 30, includedClasses: 10, packagePrice: 1000000, discountAmount: 100000, paymentAmount: 900000,
        paymentId: 105, paymentStatus: paid ? 'Paid' : 'Pending', subscriptionStatus: 'Pending', startDate: '2099-01-02', endDate: '2099-01-31' }] : []
      else if (path === `${base}/packages/renewal` && request.method() === 'GET') body = { success: true,
        currentSubscription: channel === 'stale' && previews.length ? { ...current, subscriptionId: 99 } : current,
        availablePackages: [pack, { id: 4, name: 'Gói khác không được chọn', choiceGroups: [] }] }
      else if (path === `${base}/packages/renewal/preview`) {
        const p = request.postDataJSON(); previews.push(p)
        body = { success: true, currentSubscription: current, selectedPackage: pack, renewalStart: p.renewalStart,
          listedPrice: 1000000, discountAmount: 100000, totalAmount: 900000, newStartDate: '2099-01-02', newEndDate: '2099-01-31' }
      } else if (path === `${base}/packages/renewal` && request.method() === 'POST') {
        writes.push(request.postDataJSON()); created = true; paid = channel === 'Cash'
        body.data = { subscriptionId: 41, paymentId: 105, paymentStatus: paid ? 'Paid' : 'Pending',
          startDate: '2099-01-02', endDate: '2099-01-31', paymentUrl: channel === 'Card' ? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=105' : null }
      } else if (path === `${base}/payments/105`) body = { success: true, paymentId: 105, paymentType: 'Subscription',
        paymentStatus: paid ? 'Paid' : 'Pending', bookingStatus: paid ? 'Chờ bắt đầu' : 'Chờ thanh toán', requiresReview: false,
        paymentAmount: 900000, expiresAt: '2099-01-01T00:00:00+07:00', qrPayment: paid ? null : { testMode: true, bankCode: 'MBBank',
          accountNumber: '0123456789', accountName: 'TEST', paymentCode: 'SWP105', qrUrl: 'https://vietqr.app/img?amount=900000&des=SWP105' } }
      else throw new Error(`Unexpected request ${path}`)
      return route.fulfill({ headers, json: body })
    })
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('http://127.0.0.1:5179/receptionist/members/7')
    await page.getByRole('button', { name: 'Gia hạn gói', exact: true }).click()
    const modal = page.getByRole('dialog')
    await modal.getByRole('textbox', { name: 'Gói gia hạn' }).waitFor()
    assert.equal(await modal.getByRole('combobox', { name: 'Hình thức thanh toán' }).count(), 0)
    assert.equal(await modal.getByText('Gói khác không được chọn', { exact: true }).count(), 0)
    await modal.getByRole('checkbox', { name: 'Yoga lựa chọn' }).check()
    await modal.getByRole('button', { name: 'Tiếp tục thanh toán', exact: true }).click()
    await page.waitForURL('**/checkout/renewals/3')
    assert.equal(writes.length, 0, 'Moving from modal to checkout must not create renewal')
    if (channel === 'stale') {
      await page.getByRole('alert').filter({ hasText: 'Gói hiện tại đã thay đổi' }).waitFor()
    } else {
      await page.getByRole('heading', { name: 'Thanh toán gia hạn gói' }).waitFor()
      await page.getByRole('radio', { name: channel === 'Cash' ? /Tiền mặt/ : channel === 'Card' ? /Thẻ VNPay/ : /Mã QR/ }).check()
      if (channel === 'Cash') {
        assert.equal(await page.getByRole('button', { name: 'Xác nhận đã nhận tiền' }).isDisabled(), true)
        await page.getByRole('checkbox', { name: /Tôi đã nhận đủ/ }).check()
      }
      await page.getByRole('button', { name: channel === 'Cash' ? 'Xác nhận đã nhận tiền' : channel === 'Card' ? 'Tiếp tục đến VNPay' : 'Tạo mã QR thanh toán' }).click()
      if (channel === 'Card') await page.waitForURL('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html**')
      else if (channel === 'Cash') await page.getByRole('heading', { name: 'Gia hạn thành công', exact: true }).waitFor()
      else {
        await page.waitForURL('**/checkout/renewals/3?paymentId=105')
        await page.reload()
        await page.getByText('SWP105', { exact: true }).waitFor()
        paid = true
        await page.getByText('Thanh toán và gia hạn thành công', { exact: true }).waitFor()
      }
      assert.deepEqual(writes, [{ packageId: 3, renewalStart: 'AFTER_CURRENT', choiceGroups: [{ choiceGroupId: 8, sportIds: [5] }], paymentMethod: channel }])
    }
    assert.deepEqual(errors, [])
    await context.close()
  }
  console.log('PASS: receptionist renewal modal -> shared checkout; original package/sports, cash confirmation, VNPay, QR reload, scheduled success and stale subscription guard')
} finally { await browser?.close(); await server.close() }
