import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import nativeReact from './ssrDependencies.mjs'
import { parseCalendarDate } from '../src/utils/classSchedule.js'

// Controlled hooks exercise the actual page handlers; API responses below are fixtures.
const hooks = {
  slots: [], setters: [], effects: [], cursor: 0,
  useState(initial) {
    const index = this.cursor++
    if (!(index in this.slots)) this.slots[index] = typeof initial === 'function' ? initial() : initial
    const setter = (value) => { this.slots[index] = typeof value === 'function' ? value(this.slots[index]) : value }
    this.setters[index] = setter
    return [this.slots[index], setter]
  },
  useRef(initial) {
    const index = this.cursor++
    if (!(index in this.slots)) this.slots[index] = { current: initial }
    return this.slots[index]
  },
  reset() { this.slots = []; this.setters = []; this.effects = [] },
}
globalThis.__termTestHooks = hooks
let role = 'Center Manager'
globalThis.localStorage = { getItem: (key) => key === 'role' ? role : key === 'accessToken' ? 'unit-test-token' : null }
const server = await createServer({
  server: { middlewareMode: true, hmr: false }, appType: 'custom',
  resolve: { alias: { axios: fileURLToPath(new URL('../node_modules/axios/dist/esm/axios.js', import.meta.url)) } },
  plugins: [nativeReact, {
    name: 'term-page-test', enforce: 'pre',
    transform(code, id) {
      if (['/src/pages/ClassManagement.jsx', '/src/pages/MemberSchedule.jsx'].some((path) => id.replaceAll('\\', '/').endsWith(path))) {
        return code.replace("from 'react'", "from 'virtual:term-test-hooks'")
      }
    },
    resolveId(source) { if (source === 'virtual:term-test-hooks') return '\0term-test-hooks' },
    load(id) {
      if (id === '\0term-test-hooks') return `
        export const useState = (value) => globalThis.__termTestHooks.useState(value);
        export const useRef = (value) => globalThis.__termTestHooks.useRef(value);
        export const useEffect = (effect) => { globalThis.__termTestHooks.effects.push(effect); };
        export const useMemo = (factory) => factory();
        export const useCallback = (callback) => callback;
      `
    },
  }],
})
try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const { default: Admin } = await server.ssrLoadModule('/src/pages/ClassManagement.jsx')
  const { default: Member } = await server.ssrLoadModule('/src/pages/MemberSchedule.jsx')
  let calls = []
  let memberItems = []
  const savedClass = { id: 3, code: 'CLS-003', name: 'Yoga', daysOfWeek: ['T3', 'T5'],
    startDate: '2026-10-13', durationWeeks: 1, endDate: '2026-10-18', status: 'Completed' }
  const options = { subjects: [{ id: 1, name: 'Yoga' }], coaches: [{ id: 2, fullName: 'Coach' }],
    rooms: [{ id: 4, name: 'Studio' }], timeSlots: [
      { id: 1, startTime: '07:00', endTime: '09:15' }, { id: 2, startTime: '09:30', endTime: '11:45' },
      { id: 3, startTime: '12:30', endTime: '14:45' }, { id: 4, startTime: '15:00', endTime: '17:15' },
    ] }
  client.defaults.adapter = async (config) => {
    calls.push(config)
    const data = config.url === '/api/classes/options' ? { success: true, data: options }
      : config.url === '/api/member/classes/my-classes' ? { success: true, classes: memberItems }
        : config.url === '/api/classes' && config.method === 'get' ? { success: true, data: [savedClass] }
          : { success: true, data: savedClass }
    return { data, status: 200, headers: {}, config }
  }
  let view
  function render(Page = Admin) {
    hooks.cursor = 0; hooks.effects = []
    view = Page()
    return view
  }
  function nodes(node) {
    if (!node || typeof node !== 'object') return []
    return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
  }
  const text = (node) => typeof node === 'string' || typeof node === 'number' ? String(node)
    : !node || typeof node !== 'object' ? '' : [node.props?.children].flat(Infinity).map(text).join(' ')
  const find = (predicate) => nodes(view).find(predicate)
  const label = (name) => find((node) => node.type === 'label' && text(node).trim().startsWith(name))
  function change(name, value) {
    const control = nodes(label(name)).find((node) => ['input', 'select'].includes(node.type))
    control.props.onChange({ target: { value } })
    render()
  }
  const form = () => find((node) => node.type === 'form')
  const submit = () => form().props.onSubmit({ preventDefault() {} })
  const posts = () => calls.filter((config) => config.method === 'post')
  const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve() }

  render()
  await find((node) => node.type === 'button' && text(node).includes('Tạo mới lớp học')).props.onClick()
  await flush()
  render()
  assert.equal(nodes(label('Ngày bắt đầu')).find((node) => node.type === 'input').props.required, true)
  const durationInput = nodes(label('Số tuần học')).find((node) => node.type === 'input')
  assert.equal(durationInput.props.required, true)
  assert.equal(durationInput.props.step, '1')
  change('Tên lớp học', 'Yoga')
  change('Môn học', '1')
  change('Huấn luyện viên', '2')
  change('Phòng tập', '4')
  change('Slot học', '1')
  assert.equal(nodes(label('Slot học')).filter((node) => node.type === 'option').length, 5)
  change('Giờ bắt đầu', '07:30')
  change('Giờ kết thúc', '08:45')
  change('Sức chứa', '12')
  change('Học phí', '200000')
  const toggleDay = (day, checked) => {
    nodes(label(day)).find((node) => node.type === 'input').props.onChange({ target: { checked } })
    render()
  }
  toggleDay('Thứ 3', true)
  change('Ngày bắt đầu', '2026-10-13')
  for (const weeks of ['', '0', '-1', '1.5']) {
    change('Số tuần học', weeks)
    await submit()
    assert.equal(posts().length, 0)
  }
  change('Số tuần học', '1')
  assert.match(text(view), /18\/10\/2026/)
  change('Ngày bắt đầu', '2026-10-14')
  assert.match(text(view), /phải thuộc một trong các thứ đã chọn/)
  await submit()
  assert.equal(posts().length, 0)
  change('Ngày bắt đầu', '2026-10-13')
  toggleDay('Thứ 3', false)
  toggleDay('Thứ 5', true)
  assert.match(text(view), /phải thuộc một trong các thứ đã chọn/)
  await submit()
  assert.equal(posts().length, 0)
  toggleDay('Thứ 3', true)
  assert.doesNotMatch(text(form()), /phải thuộc một trong các thứ đã chọn/)
  await submit()
  render()
  assert.deepEqual(JSON.parse(posts()[0].data), { name: 'Yoga', subjectId: 1, coachId: 2, roomId: 4,
    daysOfWeek: ['Thứ 5', 'Thứ 3'], slotId: 1, startTime: '07:30', endTime: '08:45',
    maxCapacity: 12, price: 200000, startDate: '2026-10-13', durationWeeks: 1 })
  assert.match(text(view), /Ngày kết thúc: 18\/10\/2026/)
  await find((node) => node.props['aria-label'] === 'Xem chi tiết lớp Yoga').props.onClick()
  await flush()
  render()
  const newDetail = text(find((node) => node.props.title === 'Chi tiết lớp học'))
  assert.match(newDetail, /Ngày bắt đầu.*13\/10\/2026/)
  assert.match(newDetail, /Số tuần học.*1 tuần/)
  assert.match(newDetail, /Ngày kết thúc.*18\/10\/2026/)
  assert.match(newDetail, /Trạng thái.*Hoàn thành/)
  find((node) => node.type === 'button' && text(node).trim() === 'Đóng').props.onClick()
  render()
  savedClass.startDate = null
  savedClass.durationWeeks = null
  savedClass.endDate = null
  savedClass.status = 'Active'
  find((node) => node.props['aria-label'] === 'Xem chi tiết lớp Yoga').props.onClick()
  await flush()
  render()
  const legacyDetail = text(find((node) => node.props.title === 'Chi tiết lớp học'))
  assert.match(legacyDetail, /Ngày bắt đầu.*Chưa thiết lập/)
  assert.match(legacyDetail, /Số tuần học.*Chưa thiết lập/)
  assert.match(legacyDetail, /Ngày kết thúc.*Chưa thiết lập/)
  assert.match(legacyDetail, /Trạng thái.*Đang hoạt động/)

  hooks.reset()
  role = 'Member'
  const base = { bookingId: 10, classId: 3, className: 'Yoga tuần đầu', classCode: 'CLS-003', rawStatus: 'Booked',
    status: 'Đang diễn ra', sessionStatus: 'Scheduled', startDate: '2026-10-13', durationWeeks: 2,
    endDate: '2026-10-25', sessionDate: '2026-10-13', sessionStartTime: '07:30', sessionEndTime: '08:45' }
  memberItems = [base, { ...base, bookingId: 11, className: 'Yoga tuần sau', sessionDate: '2026-10-20' },
    { ...base, bookingId: 12, className: 'Lớp giờ cũ', sessionStartTime: '18:00', sessionEndTime: '19:30' },
    { ...base, bookingId: 13, className: 'Lớp thiếu thời hạn', endDate: null, durationWeeks: null },
    { ...base, bookingId: 14, className: 'Buổi vượt thời hạn', sessionDate: '2026-10-27' }]
  render(Member)
  const cleanup = hooks.effects[0]()
  for (let i = 0; i < 20; i++) await Promise.resolve()
  hooks.setters[0](parseCalendarDate('2026-10-12'))
  render(Member)
  assert.deepEqual(calls.at(-1).params, { status: 'all' })
  const html = () => {
    hooks.cursor = 0
    return renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(Member)))
  }
  assert.equal(nodes(find((node) => node.type === 'tbody')).filter((node) => node.type === 'tr').length, 4)
  assert.match(html(), /07:30 – 08:45/)
  assert.match(html(), /Yoga tuần đầu/)
  assert.doesNotMatch(html(), /Yoga tuần sau/)
  assert.match(html(), /Lớp giờ cũ/)
  assert.match(html(), /Lớp thiếu thời hạn/)
  assert.match(html(), /Chưa thiết lập/)
  find((node) => node.props['aria-label'] === 'Tuần sau').props.onClick()
  render(Member)
  assert.match(html(), /Yoga tuần sau/)
  assert.doesNotMatch(html(), /Yoga tuần đầu/)
  find((node) => node.props['aria-label'] === 'Tuần sau').props.onClick()
  render(Member)
  assert.doesNotMatch(html(), /Buổi vượt thời hạn|Yoga tuần sau/)
  assert.match(html(), /Không có buổi học/)
  cleanup()
  console.log('PASS: real form handlers block invalid terms/days; four-slot controls and payload; backend end date/status; Member SSR four-row calendar, week changes and visible legacy exceptions (fixtures, not a live browser)')
} finally {
  delete globalThis.__termTestHooks
  delete globalThis.localStorage
  await server.close()
}
