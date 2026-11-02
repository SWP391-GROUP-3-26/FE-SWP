import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import nativeReact from './ssrDependencies.mjs'

const server = await createServer({
  server: { middlewareMode: true, hmr: false }, appType: 'custom', plugins: [nativeReact],
  resolve: { alias: { axios: fileURLToPath(new URL('../node_modules/axios/dist/esm/axios.js', import.meta.url)) } },
})
try {
  const { default: RefundDetail } = await server.ssrLoadModule('/src/components/RefundDetail.jsx')
  const { default: RegisteredClassCard } = await server.ssrLoadModule('/src/components/RegisteredClassCard.jsx')
  const refund = { id: 60, paymentId: 50, memberName: 'Member', itemName: 'Yoga',
    paidAmount: 100000, estimatedAmount: 100000, sessions: [], version: 0 }
  const renderRefund = (status, pickupCode = null) => renderToStaticMarkup(createElement(RefundDetail, {
    refund: { ...refund, status, pickupCode }, audience: 'member', onAction() {},
  }))
  for (const status of ['PENDING', 'REJECTED', 'PAID']) {
    const html = renderRefund(status, 'HT-OLD-CODE')
    assert.doesNotMatch(html, /Chọn nhận tại quầy và tạo mã|finance-pickup-code|HT-OLD-CODE/)
  }
  assert.match(renderRefund('PENDING'), /Yêu cầu đang chờ quản lý duyệt/)
  assert.match(renderRefund('APPROVED'), /Chọn nhận tại quầy và tạo mã/)
  const code = renderRefund('APPROVED', 'HT-APPROVED-CODE')
  assert.match(code, /finance-pickup-code/)
  assert.match(code, /HT-APPROVED-CODE/)
  assert.doesNotMatch(code, /Chọn nhận tại quầy và tạo mã/)
  const row = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement('table', {},
    createElement('tbody', {}, createElement(RegisteredClassCard, {
      item: { paymentId: 50, paymentStatus: 'Pending', className: 'Yoga', canCancel: true },
    })))))
  assert.doesNotMatch(row, /Thanh toán \/ hoàn tiền|\/member\/payment-history/)
  assert.match(row, /payment-result\?paymentId=50/)
  assert.match(row, /Chi tiết/)
  assert.match(row, /Hủy lớp/)
  console.log('PASS: refund code creation/display only after approval, pending legacy codes hidden, class refund link removed and pending payment preserved')
} finally {
  await server.close()
}
