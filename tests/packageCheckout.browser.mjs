import assert from 'node:assert/strict'
import { createServer } from 'vite'

// Optional browser regression check: provide PLAYWRIGHT_MODULE when Playwright is bundled outside the repo.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5175, strictPort: true, hmr: false } })
await server.listen()
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
const origin = 'http://127.0.0.1:5175'
const current = { subscriptionId: 10, packageId: 1, packageName: 'Basic', packagePrice: 300000, durationDays: 30,
  startDate: '2026-10-01', endDate: '2099-10-31', subscriptionStatus: 'Active', paymentStatus: 'Paid', paymentMethod: 'Cash' }
const basic = { id: 1, name: 'Basic', price: 300000, durationDays: 30, choiceGroups: [] }
const standard = { id: 2, name: 'Standard', price: 500000, durationDays: 30, includedClasses: 12,
  choiceGroups: [{ id: 4, name: 'Môn tự chọn', requiredSelection: 1, sports: [{ id: 9, name: 'Yoga' }] }] }
const errors = []

async function setup(role, active = false, paidFuture = false) {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } })
  await context.addInitScript((role) => {
    for (const [key, value] of Object.entries({ accessToken: 'test-only', userId: '7', role, fullName: 'Test Member', status: 'Active' })) localStorage.setItem(key, value)
  }, role)
  const posts = []
  await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }))
  await context.route('https://vietqr.app/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280"/>' }))
  await context.route('https://sandbox.vnpayment.vn/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>Test gateway</title><p>VNPay test destination</p>' }))
  await context.route('http://localhost:8080/api/**', async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname
    const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    let body
    if (request.method() === 'POST' && !path.endsWith('/preview')) {
      const payload = request.postDataJSON(); posts.push({ path, payload })
      body = { success: true, data: { subscriptionId: 11, paymentId: 100, paymentStatus: role === 'Receptionist' ? 'Paid' : 'Pending',
        paymentUrl: payload.paymentMethod === 'Card' ? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=100' : null } }
    } else if (path.endsWith('/renewal/preview')) {
      const payload = request.postDataJSON()
      body = { success: true, currentSubscription: current, selectedPackage: payload.packageId === 1 ? basic : standard,
        renewalStart: payload.renewalStart, newStartDate: '2099-11-01', newEndDate: '2099-11-30', listedPrice: 500000, discountAmount: 50000, totalAmount: 450000 }
    } else if (path.endsWith('/renewal')) body = { success: true, currentSubscription: current, availablePackages: [basic, standard] }
    else if (path.endsWith('/subscriptions') || path.endsWith('/members/7/packages')) body = { success: true, data: active ? [current] : [] }
    else if (path.endsWith('/packages/2')) body = { success: true, data: standard }
    else if (path.endsWith('/packages')) body = { success: true, data: [standard], total: 1, page: 0, size: 20 }
    else if (path.endsWith('/members/7/classes')) body = { success: true, classes: [] }
    else if (path.endsWith('/members/7')) body = { success: true, data: { userId: 7, fullName: 'Test Member', status: 'Active', activePackages: active ? [current] : [], activeClasses: [] } }
    else if (path.endsWith('/users/me')) body = { success: true, data: { userId: 7, fullName: 'Test Member', status: 'Active' } }
    else if (path.endsWith('/payments/100')) body = { success: true, paymentId: 100, paymentType: 'Subscription', itemName: 'Standard',
      paymentStatus: paidFuture ? 'Paid' : 'Pending', bookingStatus: paidFuture ? 'Chờ bắt đầu' : 'Chờ thanh toán', paymentAmount: 450000,
      expiresAt: new Date(Date.now() + 900000).toISOString(), requiresReview: false,
      qrPayment: paidFuture ? null : { testMode: true, bankCode: 'MBBank', accountNumber: '0123456789', accountName: 'TEST ONLY', paymentCode: 'SWP100', qrUrl: 'https://vietqr.app/img?des=SWP100' } }
    else throw new Error(`Unexpected API: ${path}`)
    await route.fulfill({ status: 200, headers, json: body })
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(String(error)))
  return { page, context, posts }
}

try {
  {
    const { page, context, posts } = await setup('Receptionist', true)
    await page.goto(`${origin}/receptionist/members/7`, { waitUntil: 'domcontentloaded' })
    const card = page.locator('.member-enrollment-card').first()
    const renewal = card.getByRole('button', { name: 'Gia hạn gói', exact: true })
    const cancel = card.getByRole('button', { name: 'Hủy gói', exact: true })
    await renewal.waitFor()
    assert.ok((await renewal.boundingBox()).y < (await cancel.boundingBox()).y)
    await renewal.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Gói gia hạn').selectOption('1')
    await dialog.locator('.member-renewal-preview').waitFor()
    await dialog.getByRole('checkbox', { name: /Tôi xác nhận/ }).check()
    await dialog.getByRole('button', { name: 'Xác nhận gia hạn' }).click()
    await page.getByText('Gia hạn gói tập thành công.', { exact: true }).waitFor()
    assert.equal(posts[0].path, '/api/receptionist/registrations/members/7/packages/renewal')
    assert.equal(posts[0].payload.paymentMethod, 'Cash')
    await context.close()
    console.log('PASS browser: receptionist renews directly above Cancel on the existing membership card.')
  }
  for (const renewal of [false, true]) {
    for (const method of ['Card', 'E_Wallet']) {
      const { page, context, posts } = await setup('Member', renewal)
      await page.goto(`${origin}/member/packages`, { waitUntil: 'domcontentloaded' })
      if (renewal) {
        await page.getByRole('button', { name: 'Gia hạn gói', exact: true }).click()
        await page.getByRole('dialog').getByLabel('Gói gia hạn').selectOption('2')
      } else await page.getByRole('button', { name: /Chọn gói/ }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('checkbox', { name: 'Yoga', exact: true }).check()
      const methods = dialog.getByLabel('Hình thức thanh toán')
      assert.deepEqual(await methods.locator('option').evaluateAll((items) => items.map((item) => item.value)), ['Card', 'E_Wallet'])
      await methods.selectOption(method)
      const submit = dialog.getByRole('button', { name: renewal ? 'Xác nhận gia hạn' : 'Tiếp tục thanh toán', exact: true })
      await submit.click()
      if (method === 'Card') await page.waitForURL('https://sandbox.vnpayment.vn/**')
      else {
        await page.getByRole('region', { name: 'Thanh toán QR SePay' }).waitFor()
        await page.getByRole('img', { name: 'QR thanh toán SWP100' }).waitFor()
        assert.ok(page.url().includes('/member/payment-result?paymentId=100'))
      }
      assert.equal(posts.length, 1)
      assert.equal(posts[0].path, `/api/member/packages/${renewal ? 'renewal' : 'register'}`)
      assert.equal(posts[0].payload.paymentMethod, method)
      assert.deepEqual(posts[0].payload.choiceGroups, [{ choiceGroupId: 4, sportIds: [9] }])
      await context.close()
      console.log(`PASS browser: member ${renewal ? 'renewal' : 'purchase'} ${method} opens payment; no cash; correct sport payload.`)
    }
  }
  {
    const { page, context } = await setup('Member', true, true)
    await page.goto(`${origin}/member/payment-result?paymentId=100&type=package`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Thanh toán và đăng ký thành công' }).waitFor()
    await page.getByText('Gói đã được thanh toán và sẽ bắt đầu sau khi gói hiện tại hết hạn.').waitFor()
    assert.ok(await page.getByRole('link', { name: 'Về gói tập' }).isVisible())
    await context.close()
  }
  assert.deepEqual(errors, [])
} finally { await browser.close(); await server.close() }
