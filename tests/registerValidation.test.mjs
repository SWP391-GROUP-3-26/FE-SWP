import assert from 'node:assert/strict'
import { normalizePhone, validateRegister } from '../src/utils/registerValidation.js'

const valid = {
  username: ' New.Member_1 ', fullName: ' Nguyễn Văn An ', email: ' NEW@Example.com ',
  phone: '+84 (90) 123-4567', password: ' Password1! ', confirmPassword: ' Password1! ',
}
const { errors, payload } = validateRegister(valid)
assert.deepEqual(errors, {})
assert.deepEqual(payload, {
  username: 'new.member_1', fullName: 'Nguyễn Văn An', email: 'new@example.com',
  phone: '0901234567', password: valid.password, confirmPassword: valid.confirmPassword,
})
assert.equal(valid.username, ' New.Member_1 ')
for (const phone of ['0901234567', ' 090 123.45-67 ', '+84 (90) 123-4567', '84 90 123 4567']) {
  assert.equal(normalizePhone(phone), '0901234567')
}
for (const prefix of [
  '032', '033', '034', '035', '036', '037', '038', '039', '086', '096', '097', '098',
  '070', '076', '077', '078', '079', '089', '090', '093',
  '081', '082', '083', '084', '085', '088', '091', '094',
]) assert.equal(validateRegister({ ...valid, phone: `${prefix}1234567` }).errors.phone, undefined)

const invalid = {
  username: ['', '   ', 'bad name', 'a'.repeat(51), 'member-name', 'thành.viên'],
  fullName: ['', '   ', 'a'.repeat(101)],
  email: ['', '   ', 'invalid', `${'a'.repeat(89)}@example.com`],
  phone: ['', '   ', '0121234567', '090123', '09012345678', '+840901234567', '090abc4567'],
  password: ['', 'Aa1!', 'password1!', 'PASSWORD1!', 'Password!!', 'Password12', 'Aa1!' + 'a'.repeat(69)],
  confirmPassword: ['', 'Mismatch1!'],
}
for (const [field, values] of Object.entries(invalid)) {
  for (const value of [...values, undefined]) {
    assert.ok(validateRegister({ ...valid, [field]: value }).errors[field], `${field} must reject invalid input`)
  }
}
assert.equal(Object.keys(validateRegister({}).errors).length, 6)
assert.deepEqual(validateRegister({
  ...valid, username: 'a'.repeat(50), fullName: 'a'.repeat(100), email: `${'a'.repeat(88)}@example.com`,
  password: 'Aa1!' + 'a'.repeat(68), confirmPassword: 'Aa1!' + 'a'.repeat(68),
}).errors, {})
assert.deepEqual(validateRegister({ ...valid, password: 'Aa1!aaaa', confirmPassword: 'Aa1!aaaa' }).errors, {})
assert.ok(validateRegister({ ...valid, password: ' Password1!', confirmPassword: 'Password1!' }).errors.confirmPassword)
assert.deepEqual(Object.keys(validateRegister({ ...valid, role: 'Coach', status: 'Inactive' }).payload).sort(),
  ['username', 'fullName', 'email', 'phone', 'password', 'confirmPassword'].sort())
console.log('PASS: Shared registration normalization, required fields, limits, phone prefixes and password validation')
