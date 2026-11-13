import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import Modal from '../../components/common/Modal'
import TablePagination from '../../components/common/TablePagination'
import { staffMenuItems } from '../../layouts/staffMenuItems'
import { getRole } from '../../auth/authStorage'
import { ROLES } from '../../auth/roleConfig'
import { createRoom, deleteRoom, getRoomById, getRoomOptions, getRooms, updateRoom } from '../../services/roomService'
import './RoomManagement.css'

const EMPTY = { name: '', type: '', maxCapacity: '', location: '', status: 'Active' }
const PAGE_SIZE = 10

function explainError(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền quản lý phòng.'
  return error.response?.data?.message || error.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.'
}

function roomGroup(type) {
  if (type === 'SWIMMING_POOL') return 'Thể thao dưới nước'
  if (['FOOTBALL_COURT', 'BASKETBALL_COURT', 'BADMINTON_COURT', 'TABLE_TENNIS_COURT', 'TENNIS_COURT', 'MULTIPURPOSE'].includes(type)) return 'Sân & nhà đa năng'
  return 'Phòng tập'
}

export default function RoomManagement() {
  const role = getRole()
  const [rooms, setRooms] = useState([])
  const [options, setOptions] = useState({ types: [], statuses: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [detail, setDetail] = useState(null)
  const [modalError, setModalError] = useState('')
  const [busy, setBusy] = useState(false)
  const listController = useRef(null)
  const detailController = useRef(null)

  const load = useCallback(async () => {
    listController.current?.abort()
    const controller = new AbortController()
    listController.current = controller
    setLoading(true); setError('')
    try {
      const [rows, catalog] = await Promise.all([getRooms({ signal: controller.signal }), getRoomOptions(controller.signal)])
      if (!controller.signal.aborted) { setRooms(rows); setOptions(catalog) }
    } catch (reason) {
      if (!controller.signal.aborted) setError(explainError(reason))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Quản lý phòng & sân - UniSports'
    const timer = setTimeout(() => { void load() }, 0)
    return () => { clearTimeout(timer); listController.current?.abort(); detailController.current?.abort(); document.title = previousTitle }
  }, [load])

  function closeModal() {
    detailController.current?.abort()
    setModal(null); setModalError(''); setDetail(null)
  }

  function startCreate() { setForm(EMPTY); setModalError(''); setModal({ type: 'form', mode: 'create' }) }
  function startEdit(room) {
    setForm({ name: room.name || '', type: room.type || '', maxCapacity: String(room.maxCapacity ?? ''), location: room.location || '', status: room.status || 'Active' })
    setModalError(''); setModal({ type: 'form', mode: 'edit', room })
  }

  async function openDetail(room) {
    detailController.current?.abort()
    const controller = new AbortController(); detailController.current = controller
    setModal({ type: 'detail', room }); setDetail(null); setModalError('')
    try {
      const data = await getRoomById(room.id, controller.signal)
      if (!controller.signal.aborted) setDetail(data)
    } catch (reason) { if (!controller.signal.aborted) setModalError(explainError(reason)) }
  }

  async function save(event) {
    event.preventDefault()
    if (busy) return
    const payload = { ...form, name: form.name.trim(), location: form.location.trim(), maxCapacity: Number(form.maxCapacity) }
    if (!payload.name || !payload.type || !payload.location || !Number.isInteger(payload.maxCapacity) || payload.maxCapacity < 1) {
      setModalError('Vui lòng nhập tên, loại, vị trí và sức chứa hợp lệ.')
      return
    }
    setBusy(true); setModalError('')
    try {
      if (modal.mode === 'create') await createRoom(payload)
      else await updateRoom(modal.room.id, payload)
      closeModal(); setNotice(modal.mode === 'create' ? 'Đã tạo phòng/sân.' : 'Đã cập nhật phòng/sân.')
      await load()
    } catch (reason) { setModalError(explainError(reason)) }
    finally { setBusy(false) }
  }

  async function removeRoom() {
    if (busy || modal?.type !== 'delete') return
    setBusy(true); setModalError('')
    try {
      await deleteRoom(modal.room.id)
      closeModal(); setNotice(`Đã xóa “${modal.room.name}”.`); await load()
    } catch (reason) { setModalError(explainError(reason)) }
    finally { setBusy(false) }
  }

  const query = search.trim().toLocaleLowerCase('vi')
  const filteredRooms = rooms.filter((room) =>
    (!statusFilter || room.status === statusFilter) && (!typeFilter || room.type === typeFilter) &&
    [room.name, room.code, room.location, room.typeLabel, room.type]
      .some((value) => String(value ?? '').toLocaleLowerCase('vi').includes(query)))
  const activeCount = rooms.filter((room) => room.status === 'Active').length
  const maintenanceCount = rooms.filter((room) => room.status === 'Maintenance').length
  const inactiveCount = rooms.filter((room) => room.status === 'Inactive').length
  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const visible = useMemo(() => filteredRooms.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE), [filteredRooms, currentPage])

  return <DashboardLayout role={role} menuItems={staffMenuItems[role] || []} eyebrow="Dịch vụ & đào tạo / Cơ sở vật chất" title="Quản lý phòng & sân">
    <div className="room-management">
      {notice && <div className="auth-notice room-notice" role="status"><span>{notice}</span><button className="icon-button" type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
      <section className="room-intro">
        <div><span className="room-eyebrow">CƠ SỞ VẬT CHẤT</span><h2>Phòng & sân tập</h2><p>Mỗi không gian là một tài nguyên riêng để xếp lớp, quản lý sức chứa và tránh trùng lịch.</p></div>
        <button className="subject-button subject-primary" type="button" onClick={startCreate}><span className="material-symbols-outlined" aria-hidden="true">add</span>Thêm phòng / sân</button>
      </section>

      <section className="room-stats" aria-label="Tổng quan phòng tập">
        <article><span className="material-symbols-outlined">meeting_room</span><div><small>Tổng địa điểm</small><strong>{rooms.length}</strong></div></article>
        <article><span className="material-symbols-outlined">check_circle</span><div><small>Đang hoạt động</small><strong>{activeCount}</strong></div></article>
        <article><span className="material-symbols-outlined">build</span><div><small>Đang bảo trì</small><strong>{maintenanceCount}</strong></div></article>
        <article><span className="material-symbols-outlined">do_not_disturb_on</span><div><small>Ngừng sử dụng</small><strong>{inactiveCount}</strong></div></article>
      </section>

      <section className="dashboard-panel room-panel" aria-busy={loading}>
        <div className="room-toolbar">
          <label className="service-search"><span className="visually-hidden">Tìm phòng hoặc sân</span><span className="input-wrap"><span className="material-symbols-outlined">search</span><input type="search" placeholder="Tìm theo tên hoặc vị trí..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} /></span></label>
          <label className="room-filter"><span className="visually-hidden">Lọc theo loại</span><select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(0) }}><option value="">Tất cả loại địa điểm</option>{options.types.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
          <label className="room-filter"><span className="visually-hidden">Lọc theo trạng thái</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0) }}><option value="">Tất cả trạng thái</option>{options.statuses.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
          <button className="subject-button" type="button" disabled={loading} onClick={() => void load()}><span className="material-symbols-outlined">refresh</span>Làm mới</button>
        </div>
        {error && <div className="auth-error room-error" role="alert"><span>{error}</span><button className="subject-button" type="button" disabled={loading} onClick={() => void load()}>Thử lại</button></div>}
        {loading && <div className="subject-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang tải phòng và sân...</div>}
        <div className="subject-table-scroll" tabIndex={0} role="region" aria-label="Bảng phòng và sân, cuộn ngang trên màn hình nhỏ">
          <table className="subject-table room-table"><thead><tr>{['Địa điểm', 'Loại', 'Vị trí', 'Sức chứa', 'Trạng thái', 'Thao tác'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{visible.map((room) => <tr key={room.id}>
              <th scope="row"><strong>{room.name}</strong><small>{room.code || `ROOM-${String(room.id).padStart(3, '0')}`}</small></th>
              <td><span className="room-type-chip">{room.typeLabel || options.types.find((item) => item.code === room.type)?.label || room.type || 'Chưa phân loại'}</span><small>{roomGroup(room.type)}</small></td>
              <td>{room.location || '—'}</td><td>{room.maxCapacity} người</td>
              <td><span className={`room-status room-status-${String(room.status || '').toLowerCase()}`}>{room.statusLabel || room.status}</span></td>
              <td><div className="subject-actions"><button className="subject-button" type="button" onClick={() => void openDetail(room)}>Chi tiết</button><button className="subject-button" type="button" onClick={() => startEdit(room)}>Sửa</button></div></td>
            </tr>)}
              {!loading && !error && visible.length === 0 && <tr><td colSpan={6} className="subject-empty"><span className="material-symbols-outlined">meeting_room</span><p>{rooms.length ? 'Không tìm thấy địa điểm phù hợp.' : 'Chưa có phòng hoặc sân nào được cấu hình.'}</p>{rooms.length > 0 && <button className="subject-button" type="button" onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setPage(0) }}>Xóa bộ lọc</button>}</td></tr>}
            </tbody>
          </table>
        </div>
        <TablePagination page={currentPage} pageSize={PAGE_SIZE} totalItems={filteredRooms.length} itemLabel="địa điểm" onPageChange={setPage} loading={loading} />
      </section>

      <aside className="room-guidance"><span className="material-symbols-outlined">info</span><div><strong>Cấu hình theo từng tài nguyên thực tế</strong><p>Tạo riêng “Sân cầu lông 1”, “Sân cầu lông 2” hoặc “Phòng Fitness 1”, “Phòng Fitness 2”…; nhập đúng loại, vị trí và sức chứa. Chỉ phòng đang hoạt động và đúng loại môn học mới xuất hiện khi xếp lớp.</p></div></aside>
    </div>

    {modal?.type === 'form' && <Modal className="room-editor-modal" title={modal.mode === 'create' ? 'Thêm phòng / sân' : `Chỉnh sửa: ${modal.room.name}`} busy={busy} onClose={closeModal}>
      {modalError && <div className="auth-error subject-modal-error" role="alert">{modalError}</div>}
      <form className="auth-form room-form" onSubmit={save}><fieldset disabled={busy}>
        <label>Tên phòng / sân <span className="input-wrap"><input required maxLength={50} autoFocus placeholder="Ví dụ: Sân cầu lông 1" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></span></label>
        <label>Loại địa điểm <span className="input-wrap"><select required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="" disabled>Chọn loại địa điểm</option>{options.types.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></span></label>
        <div className="room-form-grid"><label>Sức chứa tối đa <span className="input-wrap"><input required type="number" min="1" step="1" value={form.maxCapacity} onChange={(event) => setForm({ ...form, maxCapacity: event.target.value })} /></span></label>
          <label>Vị trí <span className="input-wrap"><input required maxLength={150} placeholder="Ví dụ: Tầng 2, khu A" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></span></label></div>
        <label>Trạng thái <span className="input-wrap"><select required value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{options.statuses.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></span></label>
      </fieldset>
        <div className="room-form-hint"><span className="material-symbols-outlined" aria-hidden="true">info</span><p>Nếu có nhiều sân hoặc phòng độc lập, hãy tạo mỗi nơi thành một bản ghi riêng để hệ thống kiểm tra lịch trùng chính xác.</p></div>
        <div className="subject-modal-actions"><button className="subject-button" type="button" disabled={busy} onClick={closeModal}>Hủy</button><button className="subject-button subject-primary" type="submit" disabled={busy}>{busy ? 'Đang lưu...' : modal.mode === 'create' ? 'Tạo địa điểm' : 'Lưu thay đổi'}</button></div>
      </form>
    </Modal>}
    {modal?.type === 'detail' && <Modal title="Thông tin phòng / sân" className="room-detail-modal" busy={busy} onClose={closeModal}>
      {modalError && <div className="auth-error subject-modal-error" role="alert">{modalError}</div>}
      {!detail && !modalError && <div className="subject-loading" role="status">Đang tải thông tin...</div>}
      {detail && <>
        <dl className="subject-detail room-detail"><div><dt>Tên địa điểm</dt><dd>{detail.name}</dd></div><div><dt>Mã địa điểm</dt><dd>{detail.code || '—'}</dd></div><div><dt>Loại</dt><dd>{detail.typeLabel || detail.type}</dd></div><div><dt>Vị trí</dt><dd>{detail.location}</dd></div><div><dt>Sức chứa tối đa</dt><dd>{detail.maxCapacity} người</dd></div><div><dt>Trạng thái</dt><dd>{detail.statusLabel || detail.status}</dd></div></dl>
        <section className="room-assigned"><h4>Lớp sắp diễn ra hoặc đang sử dụng</h4>{detail.upcomingClasses?.length ? <ul>{detail.upcomingClasses.map((item) => <li key={item.classId}><strong>{item.name}</strong><span>{item.subjectName} · {item.maxCapacity} học viên · {item.startDate || 'Chưa có ngày'}</span></li>)}</ul> : <p>Hiện không có lớp sắp diễn ra gắn với địa điểm này.</p>}</section>
        <div className="subject-modal-actions room-detail-actions">{[ROLES.CENTER_MANAGER, ROLES.ADMIN].includes(role) && <><button className="subject-button subject-delete" type="button" onClick={() => { setModalError(''); setModal({ type: 'delete', room: detail }) }}>Xóa địa điểm</button><button className="subject-button" type="button" onClick={() => startEdit(detail)}>Chỉnh sửa</button></>}<button className="subject-button subject-primary" type="button" onClick={closeModal}>Đóng</button></div>
      </>}
    </Modal>}
    {modal?.type === 'delete' && <Modal title="Xóa phòng / sân" busy={busy} onClose={closeModal}>
      {modalError && <div className="auth-error subject-modal-error" role="alert">{modalError}</div>}
      <p>Bạn có chắc muốn xóa <strong>“{modal.room.name}”</strong>?</p><p className="room-form-hint">Địa điểm đã được lớp học sử dụng sẽ không thể xóa. Trong trường hợp đó, hãy chuyển trạng thái sang “Ngừng sử dụng”.</p>
      <div className="subject-modal-actions"><button className="subject-button" type="button" disabled={busy} onClick={closeModal}>Hủy</button><button className="subject-button subject-danger" type="button" disabled={busy} onClick={() => void removeRoom()}>{busy ? 'Đang xóa...' : 'Xác nhận xóa'}</button></div>
    </Modal>}
  </DashboardLayout>
}
