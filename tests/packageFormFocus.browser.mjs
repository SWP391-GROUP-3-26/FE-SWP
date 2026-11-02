import assert from 'node:assert/strict'
import { createServer } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5180, strictPort: true, hmr: false } })
await server.listen()
let browser
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  const context = await browser.newContext()
  const errors = []
  await context.addInitScript(() => {
    for (const [key, value] of Object.entries({ accessToken: 'test-only', userId: '1', role: 'Center Manager', fullName: 'Test Manager' })) localStorage.setItem(key, value)
  })
  await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }))
  await context.route('http://localhost:8080/api/**', (route) => {
    const path = new URL(route.request().url()).pathname
    const headers = { 'access-control-allow-origin': 'http://127.0.0.1:5180', 'access-control-allow-headers': 'authorization,content-type' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const data = path === '/api/packages' ? [{ id: 1, name: 'Test Package', description: '', price: 100000, durationMonths: 1, status: 'Active', includedClasses: 10 }]
      : path === '/api/subjects' ? [{ id: 1, name: 'Yoga', status: 'Active' }] : []
    return route.fulfill({ headers, json: { success: true, data } })
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:5180/center-manager/packages')
  for (const mode of ['create', 'edit']) {
    if (mode === 'create') await page.getByRole('button', { name: /Tạo mới gói tập/ }).click()
    else await page.getByRole('button', { name: 'Chỉnh sửa gói Test Package', exact: true }).click()
    const modal = page.getByRole('dialog')
    const name = modal.locator('input[name="name"]')
    await name.fill('Tên giữ nguyên')
    for (const [selector, text] of [['textarea[name="description"]', 'Mo ta nhieu ky tu'], ['input[name="price"]', '125000'], ['input[name="includedClasses"]', '12'], ['textarea[name="benefits"]', 'Dac quyen bo sung']]) {
      const input = modal.locator(selector)
      await input.fill('')
      const original = await input.elementHandle()
      await input.pressSequentially(text)
      assert.equal(await input.inputValue(), text, `${mode}: preserve all typed characters`)
      assert.equal(await input.evaluate((element) => document.activeElement === element), true, `${mode}: keep focus`)
      assert.equal(await original.evaluate((element) => element.isConnected), true, `${mode}: do not remount input`)
      assert.equal(await name.inputValue(), 'Tên giữ nguyên')
    }
    const price = modal.locator('input[name="price"]')
    for (const value of ['1', '1000', '125000', '500000']) {
      await price.fill(value)
      assert.equal(await price.evaluate((element) => element.checkValidity()), true, `${mode}: accept whole VND amount ${value}`)
    }
    for (const value of ['0', '-1', '1.5']) {
      await price.fill(value)
      assert.equal(await price.evaluate((element) => element.checkValidity()), false, `${mode}: reject non-positive or fractional VND amount ${value}`)
    }
    await modal.getByRole('button', { name: 'Huỷ bỏ', exact: true }).click()
  }
  assert.deepEqual(errors, [])
  await context.close()
  console.log('Package create/edit forms preserve focus, input identity and all characters while typing in description, price, class allowance and benefits.')
} finally {
  await browser?.close()
  await server.close()
}
