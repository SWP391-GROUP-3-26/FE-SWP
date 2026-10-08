import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import Modal from '../components/Modal'
import { staffMenuItems } from '../components/staffMenuItems'
import { getRole } from '../auth/authStorage'
import {
  createClass,
  deleteClass,
  getClassById,
  getClasses,
  getClassFormOptions,
} from '../services/classService'
import './ServiceManagement.css'

const EMPTY_FORM = {
  name: '',
  subjectId: '',
  coachId: '',
  roomId: '',
  daysOfWeek: [],
  startTime: '',
  endTime: '',
  maxCapacity: '',
  price: '',
  startDate: '',
}
const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

function errorMessage(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  return error.response?.data?.message || (error.request ? 'Không thể kết nối máy chủ. Vui lòng thử lại.' : error.message) || 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

function statusLabel(status) {
  const normalized = String(status || '').toLocaleLowerCase('vi')
  if (['active', 'đang hoạt động', 'đang mở'].includes(normalized)) return 'Đang hoạt động'
  if (['completed', 'complete', 'hoàn thành'].includes(normalized)) return 'Hoàn thành'
  if (['cancel', 'cancelled', 'canceled', 'đã hủy'].includes(normalized)) return 'Đã hủy'
  return status || '—'
}

export default function ClassManagement() {
  const role = getRole()
  const [classes, setClasses] = useState([])
  const [options, setOptions] = useState({ subjects: [], coaches: [], rooms: [] })
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [modalError, setModalError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const listController = useRef(null)
  const detailController = useRef(null)

  const loadClasses = useCallback(async () => {
    listController.current?.abort()
    const controller = new AbortController()
    listController.current = controller
    setLoading(true)
    setListError('')
    try {
      const result = await getClasses({ search: search.trim(), status, signal: controller.signal })
      if (!controller.signal.aborted) setClasses(result.data)
    } catch (error) {
      if (!controller.signal.aborted) setListError(errorMessage(error))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Quản lý lớp học - UniSports'
    const timer = setTimeout(() => { void loadClasses() }, 0)
    return () => {
      clearTimeout(timer)
      listController.current?.abort()
      detailController.current?.abort()
      document.title = previousTitle
    }
  }, [loadClasses])

  function closeModal() {
    detailController.current?.abort()
    setModal(null)
    setModalError('')
    setDetail(null)
  }

  async function openCreate() {
    setModal('create')
    setForm(EMPTY_FORM)
    setModalError('')
    setOptionsLoading(true)
    try {
      const formOptions = await getClassFormOptions()
      setOptions(formOptions)
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setOptionsLoading(false)
    }
  }

  async function openDetail(item) {
    detailController.current?.abort()
    const controller = new AbortController()
    detailController.current = controller
    setModal({ type: 'detail', item })
    setDetail(null)
    setModalError('')
    try {
      const result = await getClassById(item.id, controller.signal)
      if (!controller.signal.aborted) setDetail(result)
    } catch (error) {
      if (!controller.signal.aborted) setModalError(errorMessage(error))
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    if (busy) return
    if (form.daysOfWeek.length === 0) {
      setModalError('Vui lòng chọn ít nhất một ngày học.')
      return
    }
    const payload = {
      ...form,
      subjectId: Number(form.subjectId),
      coachId: Number(form.coachId),
      roomId: Number(form.roomId),
      maxCapacity: Number(form.maxCapacity),
      price: Number(form.price),
      startDate: form.startDate || null,
      status: 'Active',
    }
    setBusy(true)
    setModalError('')
    try {
      await createClass(payload)
      closeModal()
      setNotice('Tạo lớp học thành công.')
      await loadClasses()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (busy || modal?.type !== 'delete') return
    setBusy(true)
    setModalError('')
    try {
      await deleteClass(modal.item.id)
      closeModal()
      setNotice(`Đã xóa lớp “${modal.item.name}”.`)
      await loadClasses()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(classes.length / 5))
  const visibleClasses = useMemo(() => classes.slice((page - 1) * 5, page * 5), [classes, page])
  const dayOptions = optionsLoading ? [] : options

  return (
    <DashboardLayout role={role} menuItems={staffMenuItems[role] || []}
      eyebrow="Dịch vụ & đào tạo / Quản lý dịch vụ" title="Danh mục lớp học"
      subtitle="Tìm kiếm, theo dõi và tạo lớp học dựa trên dữ liệu lớp, môn học, huấn luyện viên và phòng tập từ hệ thống.">
      {notice && <div className="auth-notice service-notice" role="status">
        <span>{notice}</span>
        <button className="icon-button" aria-label="Đóng thông báo" onClick={() => setNotice('')} type="button">×</button>
      </div>}
      <section className="dashboard-panel service-panel" aria-label="Danh sách lớp học" aria-busy={loading}>
        <div className="panel-heading service-heading">
          <div><h3>Danh sách lớp học</h3><p>{classes.length} lớp học</p></div>
          <button className="subject-button subject-primary" type="button" onClick={() => void openCreate()}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span>Tạo mới lớp học
          </button>
        </div>
        <div className="service-toolbar">
          <label className="service-search"><span className="visually-hidden">Tìm kiếm lớp học</span>
            <span className="input-wrap"><span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input type="search" placeholder="Tìm theo tên lớp, mã lớp hoặc giáo viên..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
            </span>
          </label>
          <label className="service-filter"><span>Trạng thái:</span>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
              <option value="">Tất cả</option><option value="Active">Đang hoạt động</option>
              <option value="Completed">Hoàn thành</option><option value="Cancelled">Đã hủy</option>
            </select>
          </label>
          <button className="subject-button" type="button" disabled={loading} onClick={() => void loadClasses()}>
            <span className="material-symbols-outlined" aria-hidden="true">refresh</span>Làm mới
          </button>
        </div>
        {listError && <div className="auth-error service-notice" role="alert">
          <span>{listError}</span><button className="subject-button" disabled={loading} onClick={() => void loadClasses()} type="button">Thử lại</button>
        </div>}
        {loading && <div className="subject-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang tải lớp học...</div>}
        <div className="subject-table-scroll" tabIndex={0} role="region" aria-label="Bảng lớp học, cuộn ngang trên màn hình nhỏ">
          <table className="subject-table service-table">
            <thead><tr>{['Mã lớp', 'Tên lớp học', 'HLV / PT phụ trách', 'Sức chứa', 'Trạng thái', 'Thao tác'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>
              {visibleClasses.map((item) => <tr key={item.id}>
                <td><code>{item.code || `CLS-${String(item.id).padStart(3, '0')}`}</code></td>
                <th scope="row"><strong>{item.name}</strong><small>{item.subject?.name || 'Chưa có môn học'}{item.room?.name ? ` · ${item.room.name}` : ''}</small></th>
                <td>{item.coach?.fullName || '—'}<small>{item.daysOfWeek?.join(', ') || 'Lịch chưa thiết lập'}{item.timeSlot ? ` · ${item.timeSlot}` : ''}</small></td>
                <td>{item.maxCapacity ?? '—'} chỗ</td>
                <td><span className={`service-status ${String(item.status || '').toLowerCase()}`}>{statusLabel(item.status)}</span></td>
                <td><div className="subject-actions">
                  <button className="subject-button" type="button" onClick={() => void openDetail(item)} aria-label={`Xem chi tiết lớp ${item.name}`}>Chi tiết</button>
                  <button className="subject-button subject-delete" type="button" onClick={() => { setModal({ type: 'delete', item }); setModalError('') }} aria-label={`Xóa lớp ${item.name}`}>Xóa</button>
                </div></td>
              </tr>)}
              {!loading && !listError && visibleClasses.length === 0 && <tr><td colSpan={6} className="subject-empty">
                <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
                <p>{classes.length ? 'Không tìm thấy lớp học phù hợp.' : 'Chưa có lớp học trong hệ thống.'}</p>
                {classes.length > 0 && <button className="subject-button" type="button" onClick={() => { setSearch(''); setStatus('') }}>Xóa bộ lọc</button>}
              </td></tr>}
            </tbody>
          </table>
        </div>
        <div className="service-footer"><span>Hiển thị {classes.length ? (page - 1) * 5 + 1 : 0}–{Math.min(page * 5, classes.length)} / {classes.length} lớp học</span>
          <div className="service-pagination">
            <button className="subject-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button" aria-label="Trang trước">‹</button>
            <span>{page} / {totalPages}</span>
            <button className="subject-button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} type="button" aria-label="Trang sau">›</button>
          </div>
        </div>
      </section>
      {modal && <Modal
        title={modal === 'create' ? 'Tạo mới lớp học' : modal.type === 'delete' ? 'Xóa lớp học' : 'Chi tiết lớp học'}
        busy={busy} onClose={closeModal}>
        {modalError && <div className="auth-error subject-modal-error" role="alert">{modalError}</div>}
        {modal === 'create' && <>
          {optionsLoading && <div className="subject-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang tải danh mục...</div>}
          {!optionsLoading && <form className="auth-form service-form" onSubmit={handleCreate}>
            <fieldset disabled={busy}>
              <label>Tên lớp học <span className="input-wrap"><input autoFocus required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></span></label>
              <label>Môn học <span className="input-wrap"><select required value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })}>
                <option value="" disabled>Chọn môn học</option>{dayOptions.subjects.map((item) => <option key={item.id} value={item.id}>{item.displayText || item.name}</option>)}
              </select></span></label>
              <label>Huấn luyện viên <span className="input-wrap"><select required value={form.coachId} onChange={(event) => setForm({ ...form, coachId: event.target.value })}>
                <option value="" disabled>Chọn huấn luyện viên</option>{dayOptions.coaches.map((item) => <option key={item.id} value={item.id}>{item.displayText || item.fullName}</option>)}
              </select></span></label>
              <label>Phòng tập <span className="input-wrap"><select required value={form.roomId} onChange={(event) => setForm({ ...form, roomId: event.target.value })}>
                <option value="" disabled>Chọn phòng tập</option>{dayOptions.rooms.map((item) => <option key={item.id} value={item.id}>{item.displayText || item.name}</option>)}
              </select></span></label>
              <fieldset className="service-days"><legend>Ngày học trong tuần</legend>{WEEKDAYS.map((day) => <label key={day}>
                <input type="checkbox" checked={form.daysOfWeek.includes(day)} onChange={(event) => setForm((current) => ({
                  ...current,
                  daysOfWeek: event.target.checked ? [...current.daysOfWeek, day] : current.daysOfWeek.filter((value) => value !== day),
                }))} />{day}
              </label>)}</fieldset>
              <div className="service-form-grid">
                <label>Giờ bắt đầu <span className="input-wrap"><input required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></span></label>
                <label>Giờ kết thúc <span className="input-wrap"><input required type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></span></label>
                <label>Sức chứa <span className="input-wrap"><input required type="number" min="1" value={form.maxCapacity} onChange={(event) => setForm({ ...form, maxCapacity: event.target.value })} /></span></label>
                <label>Học phí (VND) <span className="input-wrap"><input required type="number" min="0" step="1000" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></span></label>
                <label>Ngày bắt đầu <span className="input-wrap"><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></span></label>
              </div>
            </fieldset>
            <div className="subject-modal-actions"><button className="subject-button" disabled={busy} type="button" onClick={closeModal}>Hủy</button>
              <button className="subject-button subject-primary" disabled={busy || optionsLoading} type="submit">{busy ? 'Đang tạo...' : 'Tạo lớp học'}</button></div>
          </form>}
        </>}
        {modal?.type === 'detail' && <>
          {!detail && !modalError && <div className="subject-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang tải chi tiết...</div>}
          {detail && <dl className="subject-detail">{[
            ['Mã lớp', detail.code], ['Tên lớp học', detail.name], ['Môn học', detail.subject?.name],
            ['Huấn luyện viên', detail.coach?.fullName], ['Phòng tập', detail.room?.name],
            ['Ngày học', detail.daysOfWeek?.join(', ')], ['Khung giờ', detail.timeSlot],
            ['Sức chứa', detail.maxCapacity], ['Học phí', detail.price], ['Ngày bắt đầu', detail.startDate],
            ['Trạng thái', statusLabel(detail.status)],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || value === 0 ? value : '—'}</dd></div>)}</dl>}
          <div className="subject-modal-actions"><button className="subject-button" type="button" onClick={closeModal}>Đóng</button></div>
        </>}
        {modal?.type === 'delete' && <>
          <p>Bạn có chắc muốn xóa lớp học <strong>“{modal.item.name}”</strong>?</p>
          <p className="subject-count">Thao tác này không thể hoàn tác.</p>
          <div className="subject-modal-actions"><button className="subject-button" disabled={busy} type="button" onClick={closeModal}>Hủy</button>
            <button className="subject-button subject-danger" disabled={busy} type="button" onClick={() => void handleDelete()}>{busy ? 'Đang xóa...' : 'Xác nhận xóa'}</button></div>
        </>}
      </Modal>}
    </DashboardLayout>
  )
}
