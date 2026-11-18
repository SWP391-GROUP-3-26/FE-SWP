const priceFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

export default function MemberQrPayment({ payment }) {
  const qr = payment.qrPayment
  return (
    <section className="member-qr-payment" aria-label="Thanh toán QR SePay">
      <h3>Ví điện tử · Quét QR SePay</h3>
      <p><strong>Số tiền cần thanh toán: {priceFormatter.format(payment.paymentAmount)}</strong></p>
      <p>Mở app ngân hàng, quét QR và giữ nguyên số tiền cùng nội dung chuyển khoản.</p>
      <img className="member-payment-qr" src={qr.qrUrl} alt={`QR thanh toán ${qr.paymentCode}`} referrerPolicy="no-referrer" width="280" height="280" />
      <dl className="member-class-details">
        <div><dt>Ngân hàng</dt><dd>{qr.bankCode}</dd></div>
        <div><dt>Tài khoản nhận</dt><dd>{qr.accountNumber}</dd></div>
        <div><dt>Chủ tài khoản</dt><dd>{qr.accountName}</dd></div>
        <div><dt>Nội dung chuyển khoản</dt><dd><strong>{qr.paymentCode}</strong></dd></div>
        <div><dt>Hạn thanh toán</dt><dd>{new Date(payment.expiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</dd></div>
      </dl>
      <p>Trang tự cập nhật sau khi nhận thanh toán. Nếu ảnh QR không tải được, dùng thông tin phía trên để mô phỏng giao dịch.</p>
    </section>
  )
}
