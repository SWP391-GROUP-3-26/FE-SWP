# Đăng ký cho hội viên từ trang lễ tân

FE/BE dùng nhánh `feature/receptionist-member-registrations`. Không thay đổi database schema.

Các trang tái sử dụng màn hình hội viên:

- `/receptionist/members/:id/classes`
- `/receptionist/members/:id/packages`
- `/receptionist/members/:id/checkout/:serviceType/:serviceId` (`serviceType`: `classes` hoặc `packages`)
- `/receptionist/members/:id/payment-result?paymentId=...`

`id` trong URL là chủ sở hữu đăng ký. Backend xác thực cả vai trò Receptionist, tài khoản hội viên và quyền sở hữu giao dịch/đăng ký. Payment lưu `Receptionist_ID`; audit lưu người thực hiện.

Chọn lớp/gói từ danh mục của lễ tân mở trang thanh toán riêng, không mở popup đăng ký. Trang tải lại thông tin hội viên và dịch vụ từ API, hiển thị toàn bộ lịch/buổi còn lại hoặc thời hạn/quyền lợi/điều kiện gói. Ba phương thức: QR SePay, thẻ VNPay, tiền mặt; lớp đủ điều kiện có thêm trừ gói PACKAGE. Tiền mặt yêu cầu đánh dấu đã nhận đủ tiền trước khi gửi. QR hiển thị ngay trong trang thanh toán và lưu `paymentId` vào query để tải lại không tạo giao dịch mới. VNPay dùng URL được kiểm tra như luồng hội viên. Sau POST thành công, khóa gửi lại đơn kể cả khi phản hồi thiếu thông tin cổng thanh toán.

Tham chiếu Stitch: dự án `4695071374485473309`, màn `ba5afe01545649aab610e7ebc057f12a` (Thanh toán dịch vụ - SereneDesk). Ảnh tham chiếu lưu ở `docs/stitch-payment/reference.jpg`; bố cục phiếu đăng ký và chọn phương thức thanh toán được chuyển sang React/CSS, dùng dữ liệu thật từ API. Không dùng thông tin cá nhân, số tài khoản, QR mẫu, chiết khấu hay nghiệp vụ nâng hạng giả trong HTML tham chiếu.

Base API: `/api/receptionist/registrations`.

| Phương thức | Đường dẫn | Công dụng |
| --- | --- | --- |
| GET | `/packages`, `/classes` | Danh mục hiện có, hỗ trợ search |
| GET | `/members/{memberId}/classes/{classId}` | Preview điều kiện, lịch, số chỗ, lượt gói, tiền học |
| POST | `/members/{memberId}/classes` | PACKAGE, DIRECT/Cash, DIRECT/Card (VNPay), DIRECT/E_Wallet (SePay) |
| POST | `/members/{memberId}/packages` | Cash, Card (VNPay), E_Wallet (SePay) |
| GET | `/members/{memberId}/classes` | Danh sách đăng ký và lịch sử |
| GET | `/members/{memberId}/packages` | Lịch sử gói và giao dịch đang chờ |
| GET | `/members/{memberId}/payments/{paymentId}` | Trạng thái, hội viên, lớp/gói, QR nếu có |
| POST | `/members/{memberId}/classes/bookings/{bookingId}/cancel` | Hủy các buổi tương lai của đúng đăng ký |
| POST | `/members/{memberId}/payments/{paymentId}/cancel` | Hủy yêu cầu online còn Pending |

Tiền mặt chỉ gửi sau nút “Xác nhận đã nhận tiền”. Online tạo Pending, giữ chỗ lớp theo thời hạn hiện có; callback VNPay/SePay xác minh số tiền và xử lý lặp an toàn. Gói Pending chặn mua gói mới; hết hạn sẽ giải phóng yêu cầu. Callback đến sau hủy/hết hạn ghi Paid cần đối soát, không tự kích hoạt đăng ký. Backend kiểm tra lại điều kiện và tiền, FE không gửi số tiền để quyết định thanh toán.

Hủy lớp giữ lịch sử, hủy buổi tương lai, trả lượt theo truy vấn quota hiện có. Paid được giữ và đánh dấu requiresReview, chưa tự hoàn tiền. Hồ sơ trả thêm `activePackages[].remainingClasses`.

**Đang chờ chính sách hủy gói đã kích hoạt:** điều kiện hủy gói đã dùng, xử lý lớp đã trừ lượt, số tiền hoàn và cách ghi nhận hoàn tiền. Nút Hủy gói hiện chỉ giải thích phần đang chờ; chưa ghi thay đổi và chưa bổ sung API hủy gói Active.

Kiểm thử FE: `node tests/memberPayment.test.mjs`, `node tests/receptionistRegistration.test.mjs`, `node tests/receptionistCheckout.test.mjs`, `npm run build`, `npm run lint`.

Kiểm thử BE liên quan: `mvn -Dtest=ReceptionistRegistrationControllerTest,ReceptionistRegistrationServiceTest,OnlineSubscriptionPaymentServiceTest,MemberPaymentServiceTest,SepayServiceTest,MemberClassBookingServiceTest,ClassRegistrationFlowTest,ReceptionistMemberControllerTest test`.

Kiểm thử SQL Server (fixture tự rollback): `mvn -Dtest=ReceptionistRegistrationSqlServerTest -Dreceptionist.db.check=true test`. Đã chạy đạt 3 ca: mua gói Cash đúng chủ sở hữu; hủy QR rồi nhận callback muộn/lặp; mua gói VNPay với chữ ký và callback lặp. Bộ BE liên quan cùng khởi động Spring chạy đạt 106 ca. Kiểm thử này không gọi cổng thanh toán thật.

Cổng online vẫn cần cấu hình VNPay/SePay và callback truy cập được như luồng hội viên. Không kiểm thử chuyển tiền thật trong quá trình triển khai.
