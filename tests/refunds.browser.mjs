import assert from 'node:assert/strict'
import { createServer } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5178, strictPort: true, hmr: false } })
await server.listen()
let browser
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  const errors = [], writes = []
  let cancelled = false, refund = null
  const receipt = { id: 50, itemName: 'Bơi cơ bản', paymentType: 'Class_Booking', amount: 1000000, discountAmount: 200000,
    originalAmount: 1200000, method: 'Cash', status: 'Paid', createdAt: '2026-10-25T09:00:00', paidAt: '2026-10-25T09:00:00',
    refundedAmount: 0, retainedAmount: 1000000, requiresReview: false }
  function change(next) { refund = { ...refund, ...next, version: refund.version + 1 } }
  async function session(role) {
    const visibleRefund = (detail = false) => refund ? { ...refund, pickupCode: role === 'Member' && detail && refund.status === 'APPROVED' ? refund.pickupCode : null } : null
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    await context.addInitScript((role) => {
      for (const [key, value] of Object.entries({ accessToken: 'test-only', userId: role === 'Member' ? '1' : role === 'Center Manager' ? '2' : '3',
        role, fullName: `Test ${role}`, status: 'Active' })) localStorage.setItem(key, value)
    }, role)
    await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }))
    await context.route('http://localhost:8080/api/**', async (route) => {
      const request = route.request(), url = new URL(request.url()), method = request.method(), path = url.pathname
      const headers = { 'access-control-allow-origin': 'http://127.0.0.1:5178', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,OPTIONS' }
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers })
      let data
      if (path.endsWith('/users/me')) data = { fullName: 'Test Member', status: 'Active' }
      else if (path.endsWith('/my-classes')) return route.fulfill({ headers, json: { success: true, counts: { all: 1, ongoing: cancelled ? 0 : 1, cancelled: cancelled ? 1 : 0 }, classes: [{ bookingId: 20, paymentId: 50, classId: 10, className: receipt.itemName, status: cancelled ? 'Đã hủy' : 'Đang học', rawStatus: cancelled ? 'Cancelled' : 'Booked', canCancel: !cancelled, requiresReview: cancelled, paymentStatus: 'Paid', paymentAmount: 1000000, schedule: 'T2, T4', timeSlot: '08:00 – 09:00' }] } })
      else if (path.endsWith('/cancel-preview')) data = { bookingId: 20, totalSessions: 3, cancelSessions: 2, paidAmount: 1000000, estimatedRefund: 666666, usesPackage: false, sessions: [] }
      else if (path.endsWith('/cancel')) {
        const input = request.postDataJSON(); writes.push({ path, input }); assert.equal(input.estimatedRefund, 666666); assert.equal(input.cancelSessions, 2)
        cancelled = true
        refund = { id: 60, paymentId: 50, memberId: 1, memberName: 'Test Member', itemName: receipt.itemName, status: 'PENDING', paidAmount: 1000000,
          estimatedAmount: 666666, approvedAmount: null, totalSessions: 3, cancelledSessions: 2, reason: 'Hủy các buổi tương lai của đăng ký lớp',
          notificationRevision: 1, unread: true, version: 0, createdAt: '2026-10-30T09:00:00', updatedAt: '2026-10-30T09:00:00',
          sessions: [{ sessionId: 30, date: '2026-10-29', startTime: '08:00', refundable: false }, { sessionId: 31, date: '2026-10-31', startTime: '08:00', refundable: true }, { sessionId: 32, date: '2026-11-01', startTime: '08:00', refundable: true }] }
        return route.fulfill({ headers, json: { success: true, message: 'Đã hủy các buổi tương lai và gửi yêu cầu hoàn tiền.' } })
      } else if (path === '/api/member/training-plans') data = []
      else if (path.endsWith('/refunds/notifications')) data = refund?.unread ? [visibleRefund()] : []
      else if (path === '/api/member/payment-history') data = { items: url.searchParams.get('type') === 'Subscription' ? [] : [{ ...receipt, refund: visibleRefund() }], page: 0, size: 20, total: url.searchParams.get('type') === 'Subscription' ? 0 : 1 }
      else if (path === '/api/member/payment-history/50') data = { ...receipt, refund: visibleRefund(true), requiresReview: refund && refund.status !== 'PAID', refundedAmount: refund?.status === 'PAID' ? refund.approvedAmount : 0, retainedAmount: refund?.status === 'PAID' ? 1000000 - refund.approvedAmount : 1000000 }
      else if (path.endsWith('/read')) { writes.push({ path }); change({ unread: false }); data = visibleRefund(true) }
      else if (path.endsWith('/recipient')) {
        if (refund.status !== 'APPROVED') return route.fulfill({ status: 409, headers, json: { success: false, message: 'Chỉ được tạo mã nhận tiền khi yêu cầu hoàn tiền đã được duyệt' } })
        const input = request.postDataJSON(); assert.equal(input.version, refund.version); writes.push({ path, input })
        assert.equal(input.method, 'CASH')
        change({ payoutMethod: 'CASH', pickupCode: 'HT-ABCD-EFGH-JKLM-NPQR', pickupReady: true }); data = visibleRefund(true)
      } else if (path.endsWith('/review')) {
        const input = request.postDataJSON(); assert.equal(input.version, refund.version); writes.push({ path, input })
        change({ status: input.status, approvedAmount: input.approvedAmount, reviewNote: input.note, reviewedBy: 'Test Manager', reviewedAt: '2026-10-30T10:00:00', unread: true, notificationRevision: refund.notificationRevision + 1 }); data = visibleRefund()
      } else if (path.endsWith('/payout')) {
        const input = request.postDataJSON(); assert.equal(input.version, refund.version); writes.push({ path, input })
        if (input.pickupCode !== refund.pickupCode) return route.fulfill({ status: 400, headers, json: { success: false, message: 'Mã hoàn tiền không đúng với yêu cầu này.' } })
        change({ status: 'PAID', pickupReady: false, payoutReference: 'CASH-HT-60', payoutNote: input.note, paidBy: 'Test Cashier', paidAt: '2026-10-30T11:00:00', unread: true, notificationRevision: refund.notificationRevision + 1 }); data = visibleRefund()
      } else if (/\/refunds\/60$/.test(path)) data = visibleRefund()
      else if (/\/refunds$/.test(path)) data = { refunds: refund ? [visibleRefund()] : [], legacyPayments: [] }
      else return route.fulfill({ status: 404, headers, json: { success: false, message: `Unexpected test request ${path}` } })
      return route.fulfill({ headers, json: { success: true, data } })
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('status of 400')) errors.push(message.text()) })
    page.on('dialog', (dialog) => { errors.push('Unexpected native browser dialog'); return dialog.dismiss() })
    return { context, page }
  }
  const member = await session('Member')
  await member.page.goto('http://127.0.0.1:5178/member/classes')
  assert.equal(await member.page.getByRole('link', { name: 'Thanh toán / hoàn tiền', exact: true }).count(), 0)
  await member.page.getByRole('button', { name: 'Hủy lớp', exact: true }).click()
  await member.page.getByText('Dự kiến hoàn tiền', { exact: true }).waitFor()
  await member.page.getByRole('button', { name: 'Xác nhận hủy', exact: true }).click()
  await member.page.getByText('Đã hủy các buổi tương lai và gửi yêu cầu hoàn tiền.', { exact: false }).waitFor()
  await member.page.goto('http://127.0.0.1:5178/member/payment-history')
  await member.page.getByRole('link', { name: 'Xem chi tiết', exact: true }).click()
  assert.equal(await member.page.getByLabel('Ngân hàng', { exact: true }).count(), 0)
  await member.page.getByText('Yêu cầu đang chờ quản lý duyệt.', { exact: false }).waitFor()
  assert.equal(await member.page.getByRole('button', { name: 'Chọn nhận tại quầy và tạo mã', exact: true }).count(), 0)
  assert.equal(await member.page.locator('.finance-pickup-code').count(), 0)
  assert.equal(writes.filter((w) => w.path.endsWith('/recipient')).length, 0)

  const manager = await session('Center Manager')
  await manager.page.goto('http://127.0.0.1:5178/center-manager/refunds')
  await manager.page.getByRole('link', { name: 'Xem yêu cầu', exact: true }).click()
  await manager.page.getByRole('button', { name: 'Duyệt hoàn tiền', exact: true }).click()
  await manager.page.getByText('Đã duyệt yêu cầu, chờ chi trả.', { exact: true }).waitFor()
  assert.equal(refund.approvedAmount, 666666)
  await member.page.goto('http://127.0.0.1:5178/member/payment-history/50')
  await member.page.getByRole('button', { name: 'Chọn nhận tại quầy và tạo mã', exact: true }).click()
  await member.page.getByText('Đã tạo mã nhận tiền tại quầy.', { exact: true }).waitFor()
  const pickupCode = await member.page.locator('.finance-pickup-code').textContent()
  assert.equal(await manager.page.getByText(pickupCode, { exact: true }).count(), 0)
  await member.page.goto('http://127.0.0.1:5178/member')
  await member.page.getByRole('heading', { name: /Cập nhật hoàn tiền/ }).waitFor()
  await member.page.getByText('Bơi cơ bản — Chờ chi trả', { exact: true }).waitFor()

  const cashier = await session('Receptionist')
  await cashier.page.goto('http://127.0.0.1:5178/receptionist/refunds/60')
  const codeInput = cashier.page.getByLabel('Mã hoàn tiền của member', { exact: true })
  assert.equal(await codeInput.inputValue(), '', 'Receptionist must enter the code, never auto-fill it')
  assert.equal(await cashier.page.getByText(pickupCode, { exact: true }).count(), 0)
  await codeInput.fill('WRONG')
  await cashier.page.getByRole('button', { name: 'Xác nhận hoàn tiền tại quầy', exact: true }).click()
  const confirmModal = cashier.page.getByRole('dialog', { name: 'Xác nhận hoàn tiền tại quầy', exact: true })
  await confirmModal.getByText('Test Member', { exact: true }).waitFor()
  assert.equal(writes.filter((w) => w.path.endsWith('/payout')).length, 0, 'Opening popup must not submit payout')
  await confirmModal.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await confirmModal.waitFor({ state: 'hidden' })
  assert.equal(await codeInput.inputValue(), 'WRONG', 'Cancelling popup preserves the entered code')
  await cashier.page.getByRole('button', { name: 'Xác nhận hoàn tiền tại quầy', exact: true }).click()
  await confirmModal.getByRole('button', { name: 'Xác nhận chi trả', exact: true }).click()
  await cashier.page.getByText('Mã hoàn tiền không đúng với yêu cầu này.', { exact: false }).waitFor()
  assert.equal(refund.status, 'APPROVED')
  await codeInput.fill(pickupCode)
  await cashier.page.getByRole('button', { name: 'Xác nhận hoàn tiền tại quầy', exact: true }).click()
  await cashier.page.setViewportSize({ width: 390, height: 844 })
  await confirmModal.getByRole('heading', { name: 'Xác nhận hoàn tiền tại quầy', exact: true }).waitFor()
  assert.equal(await confirmModal.evaluate((dialog) => dialog.getBoundingClientRect().width <= window.innerWidth), true)
  if (process.env.REFUND_SCREENSHOT_DIR) await cashier.page.screenshot({ path: `${process.env.REFUND_SCREENSHOT_DIR}/refund-confirm-popup.png` })
  await confirmModal.getByRole('button', { name: 'Xác nhận chi trả', exact: true }).click()
  await cashier.page.getByText('Đã ghi nhận chi trả hoàn tiền thành công.', { exact: true }).waitFor()
  assert.equal(await cashier.page.getByRole('button', { name: 'Xác nhận hoàn tiền tại quầy', exact: true }).count(), 0)
  await member.page.goto('http://127.0.0.1:5178/member')
  await member.page.getByText('Bơi cơ bản — Đã hoàn tiền', { exact: true }).waitFor()
  await member.page.getByRole('link', { name: 'Xem chi tiết hoàn tiền', exact: false }).click()
  await member.page.getByText('CASH-HT-60', { exact: false }).waitFor()
  assert.equal(await member.page.locator('.finance-pickup-code').count(), 0, 'Redeemed code must no longer be displayed')
  await member.page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await member.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Receipt must fit mobile viewport')
  if (process.env.REFUND_SCREENSHOT_DIR) await member.page.screenshot({ path: `${process.env.REFUND_SCREENSHOT_DIR}/refund-member-receipt.png`, fullPage: true })
  await member.page.goto('http://127.0.0.1:5178/member/payment-history')
  await member.page.getByLabel('Lọc dịch vụ', { exact: true }).selectOption('Subscription')
  await member.page.getByText('Chưa có giao dịch phù hợp.', { exact: true }).waitFor()
  await member.page.goto('http://127.0.0.1:5178/center-manager/refunds')
  await member.page.waitForURL('**/member')
  assert.equal(writes.filter((w) => w.path.endsWith('/cancel')).length, 1)
  assert.equal(writes.filter((w) => w.path.endsWith('/payout')).length, 2)
  assert.deepEqual(errors, [])
  await member.context.close(); await manager.context.close(); await cashier.context.close()
  console.log('Counter refund browser flow passed: member-only code, no bank option, empty cashier input, wrong-code rejection, correct-code payout, receipt, notices and mobile layout.')
} finally {
  await browser?.close()
  await server.close()
}
