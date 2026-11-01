import assert from 'node:assert/strict'
import { createServer } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5177, strictPort: true, hmr: false } })
await server.listen()
let browser
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  const errors = [], writes = []
  const date = new Date()
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  let plan
  const classroom = { classId: 10, name: 'Bơi cơ bản', status: 'Active', startDate: today, endDate: today, students: [{ userId: 2, fullName: 'Học viên An', status: 'Booked' }] }
  async function session(role) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    await context.addInitScript((role) => {
      for (const [key, value] of Object.entries({ accessToken: 'test-only', userId: role === 'Coach' ? '1' : '2', role, fullName: role === 'Coach' ? 'Coach Bình' : 'Học viên An', status: 'Active' })) localStorage.setItem(key, value)
    }, role)
    await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }))
    await context.route('http://localhost:8080/api/**', async (route) => {
      const request = route.request(), url = new URL(request.url()), method = request.method(), path = url.pathname
      const headers = { 'access-control-allow-origin': 'http://127.0.0.1:5177', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,OPTIONS' }
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers })
      let data
      if (path.endsWith('/users/me')) data = { fullName: 'Học viên An', status: 'Active' }
      else if (path === '/api/member/refunds/notifications') data = []
      else if (path === '/api/coach/classes') return route.fulfill({ headers, json: { success: true, classes: [classroom], counts: {} } })
      else if (path === '/api/coach/classes/10') return route.fulfill({ headers, json: { success: true, ...classroom } })
      else if (path === '/api/coach/training-plans/eligible-members') data = [{ memberId: 2, memberName: 'Học viên An' }]
      else if (path.endsWith('/training-plans') && method === 'GET') data = plan && (role === 'Coach' || plan.status !== 'DRAFT') ? [plan] : []
      else if (path.endsWith('/training-plans') && method === 'POST') {
        const input = request.postDataJSON(); writes.push({ path, input })
        plan = { ...input, id: 30, className: classroom.name, memberName: 'Học viên An', coachName: 'Coach Bình', createdByName: 'Coach Bình',
          status: input.publish ? 'ASSIGNED' : 'DRAFT', publishedRevision: input.publish ? 1 : 0, unread: input.publish, publishedAt: today,
          editable: true, canRecord: input.publish, completedExercises: 0, totalExercises: input.exercises.length,
          exercises: input.exercises.map((e, i) => ({ ...e, id: i + 1, completed: false, memberResult: '' })) }
        data = plan
      } else if (path.endsWith('/read')) {
        writes.push({ path, revision: url.searchParams.get('revision') })
        plan = { ...plan, unread: false, version: plan.version + 1 }; data = plan
      } else if (path.endsWith('/result')) {
        const input = request.postDataJSON(); writes.push({ path, input })
        assert.equal(input.version, plan.version)
        plan = { ...plan, version: plan.version + 1, completedExercises: input.completed ? 1 : 0,
          exercises: plan.exercises.map((e) => e.id === Number(path.split('/').at(-2)) ? { ...e, ...input } : e) }; data = plan
      } else if (path.endsWith('/review')) {
        const input = request.postDataJSON(); writes.push({ path, input })
        plan = { ...plan, ...input, editable: false, canRecord: false, version: plan.version + 1 }; data = plan
      } else if (/training-plans\/30$/.test(path) && method === 'PUT') {
        const input = request.postDataJSON(); writes.push({ path, input })
        assert.equal(input.version, plan.version)
        plan = { ...plan, ...input, publishedRevision: plan.publishedRevision + 1, unread: true, version: plan.version + 1,
          exercises: input.exercises.map((e) => ({ ...plan.exercises.find((old) => old.id === e.id), ...e })) }; data = plan
      } else if (/training-plans\/30$/.test(path)) data = plan
      else return route.fulfill({ status: 404, headers, json: { success: false, message: `Unexpected test request ${path}` } })
      return route.fulfill({ headers, json: { success: true, data } })
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    return { context, page }
  }

  const coach = await session('Coach')
  await coach.page.goto('http://127.0.0.1:5177/coach/training-plans?new=1')
  await coach.page.getByLabel('Lớp học').waitFor({ timeout: 10000 }).catch(async (error) => {
    console.log({ url: coach.page.url(), errors, body: await coach.page.locator('body').innerText() })
    throw error
  })
  await coach.page.getByLabel('Lớp học').selectOption('10')
  await coach.page.getByRole('combobox', { name: /Học viên/ }).selectOption('2')
  await coach.page.getByLabel('Tên kế hoạch', { exact: true }).fill('Kế hoạch sức bền')
  await coach.page.getByLabel('Ngày bắt đầu', { exact: true }).fill(today)
  await coach.page.getByLabel('Ngày kết thúc', { exact: true }).fill(today)
  await coach.page.getByLabel(/^Mục tiêu/).fill('Cải thiện kỹ thuật thở')
  await coach.page.getByLabel('Tên bài tập', { exact: true }).fill('Bơi tự do')
  assert.equal(await coach.page.getByLabel('Ngày tập', { exact: true }).count(), 0)
  await coach.page.getByLabel('Khối lượng / mục tiêu bài tập', { exact: true }).fill('200m')
  await coach.page.getByLabel('Giao ngay và thông báo cho học viên').check()
  await coach.page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await coach.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Coach editor must fit mobile viewport')
  if (process.env.TRAINING_PLAN_SCREENSHOT_DIR) await coach.page.screenshot({ path: `${process.env.TRAINING_PLAN_SCREENSHOT_DIR}/training-plan-coach.png`, fullPage: true })
  await coach.page.setViewportSize({ width: 1440, height: 1000 })
  await coach.page.getByRole('button', { name: 'Lưu và giao kế hoạch', exact: true }).click()
  await coach.page.getByRole('heading', { name: 'Kế hoạch sức bền', exact: true }).waitFor()
  assert.equal(plan.memberId, 2)

  const member = await session('Member')
  await member.page.goto('http://127.0.0.1:5177/member')
  await member.page.getByText('1 chưa đọc', { exact: true }).waitFor()
  await member.page.getByRole('link', { name: 'Xem kế hoạch', exact: false }).click()
  await member.page.getByRole('heading', { name: 'Kế hoạch sức bền', exact: true }).waitFor()
  await member.page.getByLabel('Đã thực hiện bài tập').check()
  await member.page.getByLabel('Kết quả / phản hồi', { exact: true }).fill('Đã bơi đủ 200m')
  await member.page.getByRole('button', { name: 'Lưu kết quả', exact: true }).click()
  await member.page.getByText('Đã lưu kết quả tập luyện.', { exact: true }).waitFor()
  await member.page.goto('http://127.0.0.1:5177/member')
  await member.page.getByRole('heading', { name: 'Kế hoạch sức bền', exact: true }).waitFor()
  assert.equal(await member.page.getByText('1 chưa đọc', { exact: true }).count(), 0)

  await coach.page.getByRole('link', { name: 'Chỉnh sửa kế hoạch', exact: true }).click()
  await coach.page.getByLabel(/^Mục tiêu/).fill('Tăng sức bền và giữ nhịp thở')
  await coach.page.getByRole('button', { name: 'Lưu và giao kế hoạch', exact: true }).click()
  await coach.page.getByText('Đã giao kế hoạch và gửi thông báo cho học viên.', { exact: true }).waitFor()
  assert.equal(plan.exercises[0].memberResult, 'Đã bơi đủ 200m')
  await member.page.reload()
  await member.page.getByText('1 chưa đọc', { exact: true }).waitFor()
  await member.page.getByText('Cập nhật mới', { exact: true }).waitFor()
  if (process.env.TRAINING_PLAN_SCREENSHOT_DIR) await member.page.screenshot({ path: `${process.env.TRAINING_PLAN_SCREENSHOT_DIR}/training-plan-overview.png`, fullPage: true })
  await member.page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await member.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Overview must fit mobile viewport')
  if (process.env.TRAINING_PLAN_SCREENSHOT_DIR) await member.page.screenshot({ path: `${process.env.TRAINING_PLAN_SCREENSHOT_DIR}/training-plan-mobile.png`, fullPage: true })

  await coach.page.getByLabel('Nhận xét', { exact: true }).fill('Tiến bộ tốt')
  await coach.page.getByRole('button', { name: 'Hoàn thành kế hoạch', exact: true }).click()
  await coach.page.getByText('Đã hoàn thành kế hoạch.', { exact: true }).waitFor()
  await member.page.goto('http://127.0.0.1:5177/member/training-plans/30')
  await member.page.getByRole('heading', { name: 'Kế hoạch sức bền', exact: true }).waitFor()
  assert.equal(await member.page.getByRole('button', { name: 'Lưu kết quả', exact: true }).isDisabled(), true)
  await member.page.getByText('Tiến bộ tốt', { exact: true }).waitFor()
  assert.equal(await member.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Plan detail must fit mobile viewport')
  if (process.env.TRAINING_PLAN_SCREENSHOT_DIR) await member.page.screenshot({ path: `${process.env.TRAINING_PLAN_SCREENSHOT_DIR}/training-plan-detail.png`, fullPage: true })
  await member.page.goto('http://127.0.0.1:5177/coach/training-plans')
  await member.page.waitForURL('**/member')
  assert.equal(writes.filter((w) => w.path.endsWith('/read')).length, 2)
  assert.deepEqual(errors, [])
  await member.page.getByRole('button', { name: /Đăng xuất/ }).click()
  await member.page.waitForURL('http://127.0.0.1:5177/')
  assert.equal(await member.page.evaluate(() => localStorage.getItem('accessToken')), null)
  await coach.context.close(); await member.context.close()
  console.log('Training plans browser flow passed: coach assignment/edit, dashboard notices/read state, member results, completion, protected routes and mobile layout.')
} finally {
  await browser?.close()
  await server.close()
}
