import assert from 'node:assert/strict'
import { createServer } from 'vite'

// Hook lifecycle and Axios adapters exercise FE behavior without changing live users.
const hooks = {
  slots: [], effects: [], cursor: 0, effectCursor: 0, pending: [],
  useState(initial) {
    const index = this.cursor++
    if (!(index in this.slots)) this.slots[index] = initial
    return [this.slots[index], (value) => {
      this.slots[index] = typeof value === 'function' ? value(this.slots[index]) : value
    }]
  },
  useRef(initial) {
    const index = this.cursor++
    if (!(index in this.slots)) this.slots[index] = { current: initial }
    return this.slots[index]
  },
  useEffect(effect, deps) {
    const index = this.effectCursor++
    if (!this.effects[index] || deps.some((value, i) => !Object.is(value, this.effects[index].deps[i]))) {
      this.pending.push(() => {
        this.effects[index]?.cleanup?.()
        this.effects[index] = { deps, cleanup: effect() }
      })
    }
  },
  unmount() {
    this.effects.forEach((effect) => effect?.cleanup?.())
    this.slots = []; this.effects = []; this.pending = []
  },
}
globalThis.__userTestHooks = hooks
globalThis.localStorage = { getItem: (key) => ({ role: 'Center Manager', accessToken: 'unit-test-token' })[key] ?? null }
globalThis.window = { confirm: () => true }
const server = await createServer({
  server: { middlewareMode: true }, appType: 'custom',
  plugins: [{
    name: 'user-management-test', enforce: 'pre',
    transform(code, id) {
      if (id.replaceAll('\\', '/').endsWith('/src/pages/UserManagement.jsx')) {
        return code.replace("from 'react'", "from 'virtual:user-test-hooks'")
      }
    },
    resolveId(source) { if (source === 'virtual:user-test-hooks') return '\0user-test-hooks' },
    load(id) {
      if (id === '\0user-test-hooks') return `
        export const useState = (value) => globalThis.__userTestHooks.useState(value);
        export const useRef = (value) => globalThis.__userTestHooks.useRef(value);
        export const useEffect = (effect, deps) => globalThis.__userTestHooks.useEffect(effect, deps);
      `
    },
  }],
})

try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const service = await server.ssrLoadModule('/src/services/userManagementService.js')
  const { default: UserManagement } = await server.ssrLoadModule('/src/pages/UserManagement.jsx')
  let calls = []
  let payload
  client.defaults.adapter = async (config) => {
    calls.push(config)
    return { data: payload, status: 200, headers: {}, config }
  }
  payload = { success: true, roles: ['Receptionist', 'Coach', 'Member'], statuses: ['Active', 'Inactive', 'Locked'] }
  assert.deepEqual(await service.getUserManagementOptions(), { roles: payload.roles, statuses: payload.statuses })
  const user = { userId: 21, username: 'user21', fullName: 'Hội viên 21', role: 'Coach', status: 'Active' }
  payload = { success: true, message: 'Cập nhật vai trò thành công', data: user }
  assert.deepEqual(await service.updateManagedUserRole(21, 'Coach'), user)
  assert.equal(calls.at(-1).method, 'patch')
  assert.equal(calls.at(-1).url, '/api/center-manager/users/21/role')
  assert.equal(calls.at(-1).headers.Authorization, 'Bearer unit-test-token')
  assert.deepEqual(JSON.parse(calls.at(-1).data), { role: 'Coach' })
  assert.equal(calls.at(-1).timeout, 20000)
  for (const invalid of [null, {}, { success: true, data: [] }, { success: true, data: {} },
    { success: true, data: { ...user, userId: 22 } }, { success: false, message: 'Role is not configured' }]) {
    payload = invalid
    await assert.rejects(service.updateManagedUserRole(21, 'Coach'))
  }
  for (const invalid of [null, {}, { success: true, data: { roles: ['Coach'], statuses: ['Active'] } }]) {
    payload = invalid
    await assert.rejects(service.getUserManagementOptions())
  }

  let users = Array.from({ length: 21 }, (_, i) => ({ ...user, userId: i + 1,
    username: `user${i + 1}`, fullName: `Hội viên ${i + 1}`, role: 'Member' }))
  let patchError = null
  let detailError = null
  let optionsError = null
  let holdPatch = false
  let releasePatch
  const listUrl = '/api/center-manager/users'
  client.defaults.adapter = async (config) => {
    calls.push(config)
    let data
    if (config.url === `${listUrl}/options`) {
      if (optionsError) throw optionsError
      data = { success: true, roles: ['Receptionist', 'Coach', 'Member'], statuses: ['Active', 'Inactive', 'Locked'] }
    } else if (config.url === listUrl) {
      const { role, status, search, page, size } = config.params
      const filtered = users.filter((item) => (!role || item.role === role) &&
        (!status || item.status === status) && (!search || item.fullName.includes(search)))
      data = { success: true, data: filtered.slice(page * size, (page + 1) * size),
        total: filtered.length, totalPages: Math.ceil(filtered.length / size), page, size }
    } else if (config.method === 'get') {
      if (detailError) throw detailError
      data = { success: true, data: users.find((item) => item.userId === Number(config.url.split('/').at(-1))) }
    } else {
      if (holdPatch) await new Promise((resolve) => { releasePatch = resolve })
      if (patchError) throw patchError
      const id = Number(config.url.split('/').at(-2))
      const update = JSON.parse(config.data)
      users = users.map((item) => item.userId === id ? { ...item, ...update } : item)
      data = { success: true, data: users.find((item) => item.userId === id) }
    }
    return { data, status: 200, headers: {}, config }
  }

  let view
  function render() {
    hooks.cursor = 0; hooks.effectCursor = 0
    view = UserManagement()
    return view
  }
  async function settle() {
    for (let i = 0; i < 12; i++) {
      render()
      hooks.pending.splice(0).forEach((effect) => effect())
      for (let j = 0; j < 10; j++) await Promise.resolve()
    }
    return render()
  }
  function nodes(node) {
    if (!node || typeof node !== 'object') return []
    return [node, ...[node.props?.children].flat(Infinity).flatMap((child) => nodes(child))]
  }
  function find(predicate) { return nodes(view).find(predicate) }
  const text = (node) => typeof node === 'string' || typeof node === 'number' ? String(node)
    : !node || typeof node !== 'object' ? '' : [node.props?.children].flat(Infinity).map(text).join(' ')
  const button = (label) => find((node) => node.type === 'button' &&
    (text(node).trim() === label || node.props['aria-label'] === label))
  const form = () => find((node) => node.type === 'form' && node.props.onSubmit)
  const roleSelect = () => find((node) => node.props?.id === 'managed-user-role')
  const patchCalls = () => calls.filter((config) => config.url.endsWith('/role'))
  const submit = () => form().props.onSubmit({ preventDefault() {} })

  calls = []
  await settle()
  button('Member').props.onClick()
  await settle()
  find((node) => node.type === 'select' && !node.props.id).props.onChange({ target: { value: 'Active' } })
  find((node) => node.type === 'input' && node.props.type === 'search').props.onChange({ target: { value: 'Hội viên' } })
  await settle()
  button('Trang sau').props.onClick()
  await settle()
  assert.equal(calls.filter((config) => config.url === listUrl).at(-1).params.page, 1)
  const detailPromise = button('Xem thông tin user21').props.onClick()
  render()
  assert.equal(form(), undefined, 'No role editor before details load successfully')
  await detailPromise
  await settle()
  assert.equal(roleSelect().props.value, 'Member')
  assert.ok(find((node) => node.type === 'label' && node.props.htmlFor === 'managed-user-role'))
  assert.equal(button('Lưu vai trò').props.disabled, true)
  await submit()
  assert.equal(patchCalls().length, 0, 'An unchanged role must not send a PATCH')
  roleSelect().props.onChange({ target: { value: 'Center Manager' } })
  render()
  assert.equal(button('Lưu vai trò').props.disabled, true)
  await submit()
  assert.equal(patchCalls().length, 0, 'Roles outside the API options must not be saved')
  roleSelect().props.onChange({ target: { value: 'Coach' } })
  render()
  assert.equal(button('Lưu vai trò').props.disabled, false)
  holdPatch = true
  const saved = submit()
  await submit() // Also check a duplicate call before React's next render.
  await Promise.resolve()
  render()
  assert.equal(patchCalls().length, 1)
  assert.equal(form().props['aria-busy'], true)
  assert.equal(button('Đóng').props.disabled, true)
  assert.equal(find((node) => node.props.title === 'Chi tiết người dùng').props.busy, true)
  releasePatch()
  await saved
  holdPatch = false
  await settle()
  assert.equal(roleSelect().props.value, 'Coach')
  assert.match(text(view), /Cập nhật vai trò thành công/)
  assert.equal(button('Lưu vai trò').props.disabled, true)
  const listsAfterSave = calls.filter((config) => config.url === listUrl).slice(-2)
  assert.deepEqual(listsAfterSave.map((config) => config.params), [1, 0].map((page) => ({
    search: 'Hội viên', role: 'Member', status: 'Active', page, size: 20,
  })))
  assert.match(text(view), /Tổng 20 người dùng/)
  assert.equal(button('Trang sau').props.disabled, true)
  assert.equal(find((node) => node.props['aria-current'] === 'page').props.children, 1)
  button('Đóng').props.onClick()
  await settle()
  assert.equal(form(), undefined)
  assert.equal(button('Xem thông tin user21'), undefined, 'The changed user must leave the Member filter')

  await button('Xem thông tin user1').props.onClick()
  await settle()
  for (const [status, message] of [[400, 'Role is not configured'], [403, 'Center Manager role required'], [500, 'Không thể xử lý yêu cầu']]) {
    roleSelect().props.onChange({ target: { value: 'Receptionist' } })
    render()
    patchError = { response: { status, data: { message } } }
    const listCount = calls.filter((config) => config.url === listUrl).length
    await submit()
    await settle()
    assert.match(text(view), new RegExp(message))
    assert.equal(users[0].role, 'Member')
    assert.equal(button('Lưu vai trò').props.disabled, false)
    assert.equal(form().props['aria-busy'], false)
    assert.equal(calls.filter((config) => config.url === listUrl).length, listCount)
  }
  patchError = { request: {} }
  await submit()
  await settle()
  assert.match(text(view), /Không thể kết nối máy chủ/)
  patchError = null
  await submit()
  await settle()
  assert.equal(roleSelect().props.value, 'Receptionist')
  assert.match(text(view), /Tổng 19 người dùng/)
  button('Đóng').props.onClick()
  await settle()

  detailError = new Error('Không thể tải chi tiết')
  await button('Xem thông tin user2').props.onClick()
  await settle()
  assert.equal(form(), undefined)
  assert.match(text(view), /Không thể tải chi tiết/)
  detailError = null
  await button('Thử lại').props.onClick()
  await settle()
  assert.equal(roleSelect().props.value, 'Member')
  button('Đóng').props.onClick()
  await settle()
  await button('Tắt hoạt động của user2').props.onClick()
  await settle()
  assert.equal(users[1].status, 'Inactive', 'The existing status update must still work')
  assert.equal(calls.at(-1).url, `${listUrl}/2/status`)

  hooks.unmount()
  optionsError = new Error('Không thể tải danh mục')
  await settle()
  await button('Xem thông tin user3').props.onClick()
  await settle()
  assert.equal(button('Lưu vai trò').props.disabled, true)
  assert.match(text(view), /Không thể tải danh mục/)
  console.log('PASS: role/options API contracts and JWT; modal loading, unchanged/invalid roles, duplicate saves, API errors, filtered pagination, detail retry and existing status updates (unit tests)')
} finally {
  hooks.unmount()
  delete globalThis.__userTestHooks
  delete globalThis.localStorage
  delete globalThis.window
  await server.close()
}
