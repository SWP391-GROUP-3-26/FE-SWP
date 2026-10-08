import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const storage = new Map([['accessToken', 'member-class-test-token']])
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null }
try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const { getAvailableClasses } = await server.ssrLoadModule('/src/services/memberClassService.js')
  let lastRequest
  client.defaults.adapter = async (config) => {
    lastRequest = config
    return {
      data: {
        success: true,
        data: [
          { id: 4, code: 'CLS-004', status: 'Open' },
          { id: 3, code: 'CLS-003', status: 'Active' },
          { id: 2, code: 'CLS-002', status: 'Closed' },
          { id: 1, code: 'CLS-001', status: 'Cancelled' },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  const classes = await getAvailableClasses({ search: 'CLS-004' })
  assert.equal(lastRequest.url, '/api/classes')
  assert.deepEqual(lastRequest.params, { search: 'CLS-004' })
  assert.equal(lastRequest.headers.Authorization, 'Bearer member-class-test-token')
  assert.deepEqual(classes.map(({ code }) => code), ['CLS-004', 'CLS-003'])
  console.log('PASS: Member class search includes Open classes and excludes unavailable statuses')
} finally {
  delete globalThis.localStorage
  await server.close()
}
