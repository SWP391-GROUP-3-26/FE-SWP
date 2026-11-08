import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { hasPackageSportConfiguration, toPackageEditForm } from '../src/utils/packageEditForm.js'

const saved = {
  id: 6, name: 'Gói đã lưu', description: 'Mô tả', durationMonths: 3, price: 1300000,
  status: 'Active', includedClasses: 30, benefits: 'Phòng tập', discount: 5,
  termConditions: 'Điều kiện', includedSports: [{ id: 4, name: 'HIIT' }],
  choiceGroups: [{ id: 2, name: 'Môn tự chọn', description: 'Chọn một môn', requiredSelection: 1,
    sortOrder: 0, sports: [{ id: 1, name: 'Yoga' }, { id: 2, name: 'Boxing' }] }],
}
const original = structuredClone(saved)
const form = toPackageEditForm(saved)
assert.equal(hasPackageSportConfiguration(saved), true)
assert.equal(form.price, '1300000')
assert.equal(form.includedClasses, '30')
assert.equal(form.benefits, 'Phòng tập')
assert.equal(form.discount, 5)
assert.equal(form.termConditions, 'Điều kiện')
assert.deepEqual(form.includedSportIds, [4])
assert.deepEqual(form.choiceGroups, [{ groupName: 'Môn tự chọn', description: 'Chọn một môn',
  requiredSelection: 1, sortOrder: 0, sportIds: [1, 2] }])
form.includedSportIds.push(3)
form.choiceGroups[0].sportIds.pop()
assert.deepEqual(saved, original, 'Editing a draft must not mutate the server snapshot')

for (const missing of [
  { ...saved, includedSports: null, choiceGroups: null },
  { ...saved, includedSports: undefined },
  { ...saved, choiceGroups: [{ ...saved.choiceGroups[0], sports: null }] },
]) {
  assert.equal(hasPackageSportConfiguration(missing), false, 'Missing data must not be treated as saved empty configuration')
}
assert.equal(hasPackageSportConfiguration({ includedSports: [], choiceGroups: [] }), true)
assert.equal(toPackageEditForm({ ...saved, includedClasses: 0 }).includedClasses, '0')

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
globalThis.localStorage = { getItem: () => null }
try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const { getPackageById } = await server.ssrLoadModule('/src/services/packageService.js')
  let responseData = saved
  client.defaults.adapter = async (config) => ({ data: { success: true, data: responseData },
    status: 200, statusText: 'OK', headers: {}, config })
  assert.equal((await getPackageById(6)).name, saved.name)
  responseData = { ...saved, id: 4 }
  await assert.rejects(() => getPackageById(6), /không khớp gói đã chọn/)
} finally {
  delete globalThis.localStorage
  await server.close()
}
console.log('PASS: saved package fields and sport choices hydrate correctly; missing config, empty config, snapshot isolation and mismatched IDs are handled.')
