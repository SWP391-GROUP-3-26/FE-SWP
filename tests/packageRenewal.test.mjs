import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import nativeReact from './ssrDependencies.mjs'

globalThis.localStorage = { getItem: (key) => key === 'accessToken' ? 'renewal-test-token' : null }
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom',
  resolve: { alias: { axios: fileURLToPath(new URL('../node_modules/axios/dist/esm/axios.js', import.meta.url)) } },
  plugins: [nativeReact] })

try {
  const { default: client } = await server.ssrLoadModule('/src/api/axiosClient.js')
  const api = await server.ssrLoadModule('/src/services/packageRenewalService.js')
  const calls = []
  let body
  client.defaults.adapter = async (config) => {
    calls.push(config)
    return { data: body, status: 200, statusText: 'OK', headers: {}, config }
  }
  const payload = { packageId: 2, renewalStart: 'AFTER_CURRENT', choiceGroups: [{ choiceGroupId: 4, sportIds: [9] }] }
  const preview = { success: true, currentSubscription: { subscriptionId: 10 }, selectedPackage: { id: 2 },
    renewalStart: 'AFTER_CURRENT', newStartDate: '2026-11-01', newEndDate: '2026-11-30',
    listedPrice: 500000, discountAmount: 50000, totalAmount: 450000 }

  for (const memberId of [null, '7']) {
    const base = memberId ? '/api/receptionist/registrations/members/7/packages/renewal' : '/api/member/packages/renewal'
    const signal = new AbortController().signal
    body = { success: true, currentSubscription: { subscriptionId: 10 }, availablePackages: [{ id: 2 }] }
    assert.deepEqual(await api.getPackageRenewalOverview(memberId, signal), body)
    assert.equal(calls.at(-1).url, base)
    assert.equal(calls.at(-1).method, 'get')
    assert.equal(calls.at(-1).signal, signal)
    assert.equal(calls.at(-1).headers.Authorization, 'Bearer renewal-test-token')

    body = preview
    assert.deepEqual(await api.previewPackageRenewal(memberId, payload, signal), preview)
    assert.equal(calls.at(-1).url, `${base}/preview`)
    assert.equal(calls.at(-1).signal, signal)
    assert.deepEqual(JSON.parse(calls.at(-1).data), payload)

    const paymentMethod = memberId ? 'Cash' : 'Card'
    body = { success: true, data: { subscriptionId: 11, paymentId: 100, subscriptionStatus: 'Pending', paymentStatus: memberId ? 'Paid' : 'Pending' } }
    assert.deepEqual(await api.renewPackage(memberId, { ...payload, paymentMethod }), body)
    assert.equal(calls.at(-1).url, base)
    assert.equal(calls.at(-1).method, 'post')
    assert.deepEqual(JSON.parse(calls.at(-1).data), { ...payload, paymentMethod })
  }

  const beforeInvalidIds = calls.length
  for (const id of ['../7', '', '0', '-1', '2147483648']) {
    await assert.rejects(api.getPackageRenewalOverview(id))
    await assert.rejects(api.previewPackageRenewal(id, payload))
    await assert.rejects(api.renewPackage(id, payload))
  }
  assert.equal(calls.length, beforeInvalidIds)
  await assert.rejects(api.renewPackage(null, { ...payload, paymentMethod: 'Cash' }), /chỉ thanh toán/)

  for (const invalid of [null, { success: false, message: 'Gói đã thay đổi' }, { success: true, availablePackages: {} }]) {
    body = invalid
    await assert.rejects(api.getPackageRenewalOverview(null))
  }
  for (const invalid of [
    { ...preview, selectedPackage: { id: 3 } },
    { ...preview, renewalStart: 'IMMEDIATE' },
    { ...preview, totalAmount: '450000' },
    { ...preview, discountAmount: -1 },
    { ...preview, currentSubscription: null },
    { ...preview, newEndDate: null },
  ]) {
    body = invalid
    await assert.rejects(api.previewPackageRenewal(null, payload))
  }
  body = { success: false, message: 'Đã có gói chờ bắt đầu' }
  await assert.rejects(api.previewPackageRenewal(null, payload), /Đã có gói chờ bắt đầu/)
  body = { success: true, data: null }
  await assert.rejects(api.renewPackage('7', { ...payload, paymentMethod: 'Cash' }), /kiểm tra lịch sử/)
  console.log('PASS: renewal API scope, preview amounts, sports payloads, errors and response validation for member and receptionist.')
} finally {
  delete globalThis.localStorage
  await server.close()
}
