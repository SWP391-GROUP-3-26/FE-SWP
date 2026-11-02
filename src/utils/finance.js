const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
export const money = (value) => value == null ? '—' : formatter.format(value)
export const financeDate = (value) => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có dữ liệu'
export const paymentLabel = (value) => ({ Pending: 'Chờ thanh toán', Paid: 'Thành công', Failed: 'Thất bại' }[value] || value)
export const refundLabel = (value) => ({ PENDING: 'Chờ duyệt', APPROVED: 'Chờ chi trả', REJECTED: 'Từ chối', PAID: 'Đã hoàn tiền' }[value] || value)
export const methodLabel = (value) => ({ Cash: 'Tiền mặt', Card: 'VNPay', E_Wallet: 'SePay', CASH: 'Tiền mặt', BANK: 'Chuyển khoản' }[value] || value || 'Chưa cung cấp')
