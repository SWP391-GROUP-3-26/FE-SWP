import { Link } from 'react-router-dom'

export default function MemberRequestError({ error, retry, isDetail = false }) {
  const status = error.response?.status
  let message = error.response?.data?.message || (error.request
    ? 'Không thể kết nối máy chủ. Vui lòng thử lại.' : error.message)
  if (status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) message = 'Bạn không có quyền xem thông tin học viên.'
  if (status === 404) message = isDetail ? 'Không tìm thấy hồ sơ học viên.' : 'Không tìm thấy dịch vụ tìm kiếm học viên.'
  return (
    <div className="auth-error" role="alert">
      <p>{message || 'Không thể tải dữ liệu. Vui lòng thử lại.'}</p>
      {status === 401 ? <Link to="/login">Đăng nhập lại</Link> : (
        status !== 403 && !(isDetail && status === 404) && <button className="member-button" type="button" onClick={retry}>Thử lại</button>
      )}
    </div>
  )
}
