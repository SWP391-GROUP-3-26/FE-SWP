import assert from 'node:assert/strict'
import { createServer } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5176, strictPort: true, hmr: false } })
await server.listen()
let browser
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  for (const role of ['Coach', 'Member']) {
    const context = await browser.newContext()
    await context.addInitScript((role) => {
      for (const [key, value] of Object.entries({ accessToken: 'test-only', userId: '99', role, fullName: 'Test User' })) {
        localStorage.setItem(key, value)
      }
    }, role)
    const contacts = [
      { userId: 1, fullName: 'Alice', conversationId: 10 },
      { userId: 2, fullName: 'Bob', conversationId: 20 },
      { userId: 3, fullName: 'Charlie', conversationId: null },
    ]
    const historyCalls = []
    const errors = []
    let socket
    const message = (id, contactId, conversationId, content) => ({ messageId: id, senderId: contactId,
      receiverId: 99, conversationId, content, createdAt: '2026-10-29T10:00:00' })
    await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }))
    await context.route('http://localhost:8080/api/**', async (route) => {
      const url = new URL(route.request().url())
      const headers = { 'access-control-allow-origin': 'http://127.0.0.1:5176',
        'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,PUT,OPTIONS' }
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      let body = { success: true }
      if (url.pathname.endsWith('/contacts')) {
        const query = url.searchParams.get('search')?.toLowerCase() || ''
        body.items = contacts.filter((contact) => contact.fullName.toLowerCase().includes(query))
      } else if (url.pathname.endsWith('/messages')) {
        const id = Number(url.pathname.split('/')[4])
        historyCalls.push(id)
        body = { items: [message(id, id / 10, id, id === 30 ? 'New conversation' : `History ${id}`)], page: 0, hasNext: false }
      } else if (url.pathname.endsWith('/users/me')) {
        body.data = { fullName: 'Test User', status: 'Active' }
      }
      await route.fulfill({ headers, json: body })
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.routeWebSocket('**/ws/**', (ws) => {
      socket = ws
      ws.send('o')
      ws.onMessage((data) => {
        const [frame] = JSON.parse(data)
        if (frame.startsWith('CONNECT\n')) ws.send(`a${JSON.stringify(['CONNECTED\nversion:1.2\n\n\0'])}`)
      })
    })
    await page.goto(`http://127.0.0.1:5176/${role.toLowerCase()}/chat`)
    const header = page.locator('.chat-conversation-header h2')
    const search = page.locator('.chat-search-box input')
    const draft = page.getByRole('textbox', { name: 'Nhập tin nhắn' })
    await page.getByText('History 10', { exact: true }).waitFor({ timeout: 10000 }).catch(async (error) => {
      console.log({ url: page.url(), errors, historyCalls, page: await page.locator('body').innerText() })
      throw error
    })
    await draft.fill('Unsent draft')

    await search.fill('Bob')
    await page.getByRole('button', { name: /Bob/ }).waitFor()
    await page.getByRole('button', { name: /Alice/ }).waitFor({ state: 'hidden' })
    assert.equal(await header.textContent(), 'Alice')
    assert.equal(await draft.inputValue(), 'Unsent draft')
    assert.equal(await page.getByText('History 10', { exact: true }).count(), 1)

    await search.fill('No match')
    await page.locator('.chat-contact-count').filter({ hasText: /^0$/ }).waitFor()
    assert.equal(await header.textContent(), 'Alice')
    assert.equal(await page.getByText('History 10', { exact: true }).count(), 1)
    assert.deepEqual(historyCalls, [10], 'Filtering must not reload message history')

    await search.fill('')
    await page.getByRole('button', { name: /Bob/ }).waitFor()
    assert.equal(await header.textContent(), 'Alice')
    await page.getByRole('button', { name: /Bob/ }).click()
    await page.getByText('History 20', { exact: true }).waitFor()
    assert.equal(await header.textContent(), 'Bob')

    await page.getByRole('button', { name: /Charlie/ }).click()
    await search.fill('No match')
    await page.locator('.chat-contact-count').filter({ hasText: /^0$/ }).waitFor()
    socket.send(`a${JSON.stringify([`MESSAGE\n\n${JSON.stringify(message(30, 3, 30, 'New conversation'))}\0`])}`)
    await page.getByText('New conversation', { exact: true }).waitFor()
    assert.equal(await header.textContent(), 'Charlie')
    assert.equal(await draft.inputValue(), 'Unsent draft')
    assert.deepEqual(errors, [])
    await context.close()
    console.log(`PASS ${role}: search preserves selection, history and draft; clicking switches chats; filtered first messages remain visible.`)
  }
} finally {
  await browser?.close()
  await server.close()
}
