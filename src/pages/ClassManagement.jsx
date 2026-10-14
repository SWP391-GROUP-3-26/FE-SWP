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
import { CLASS_WEEKDAYS, calculateClassEndDate, formatClassDate, validateClassTerm } from '../utils/classSchedule'
import './ServiceManagement.css'

const EMPTY_FORM = {
  name: '',
  subjectId: '',
  coachId: '',
  roomId: '',
  daysOfWeek: [],
  slotId: '',
  startTime: '',
  endTime: '',
  maxCapacity: '',
  price: '',
  startDate: '',
  durationWeeks: '',
}

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
  const [options, setOptions] = useState({ subjects: [], coaches: [], rooms: [], timeSlots: [] })
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
    const termValidation = validateClassTerm(form)
    if (termValidation.startDate || termValidation.durationWeeks) {
      setModalError(termValidation.startDate || termValidation.durationWeeks)
      return
    }
    if (!selectedSlot || !form.startTime || !form.endTime
      || form.startTime < selectedSlot.startTime || form.endTime > selectedSlot.endTime) {
      setModalError('Giờ học phải nằm trong khung giờ của slot đã chọn.')
      return
    }
    if (form.endTime <= form.startTime) {
      setModalError('Giờ kết thúc phải sau giờ bắt đầu.')
      return
    }
    const payload = {
      ...form,
      slotId: Number(form.slotId),
      subjectId: Number(form.subjectId),
      coachId: Number(form.coachId),
      roomId: Number(form.roomId),
      maxCapacity: Number(form.maxCapacity),
      price: Number(form.price),
      startDate: form.startDate,
      durationWeeks: Number(form.durationWeeks),
    }
    setBusy(true)
    setModalError('')
    try {
      const result = await createClass(payload)
      closeModal()
      setNotice(`Tạo lớp học thành công. Ngày kết thúc: ${formatClassDate(result.data?.endDate)}.`)
      await loadClasses()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function handleTimeChange(field, value) {
    if (value && (!selectedSlot || value < selectedSlot.startTime || value > selectedSlot.endTime)) {
      setModalError('Giờ học phải nằm trong khung giờ của slot đã chọn.')
      return
    }
    setForm((current) => ({ ...current, [field]: value }))
    setModalError('')
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
  const selectedSlot = options.timeSlots.find((slot) => String(slot.id) === form.slotId)
  const termErrors = validateClassTerm(form)
  const previewEndDate = calculateClassEndDate(form.startDate, form.durationWeeks)

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
              <fieldset className="service-days"><legend>Ngày học trong tuần</legend>{CLASS_WEEKDAYS.map((day) => <label key={day}>
                <input type="checkbox" checked={form.daysOfWeek.includes(day)} onChange={(event) => { setForm((current) => ({
                  ...current,
                  daysOfWeek: event.target.checked ? [...current.daysOfWeek, day] : current.daysOfWeek.filter((value) => value !== day),
                })); setModalError('') }} />{day}
              </label>)}</fieldset>
              <label>Slot học <span className="input-wrap"><select required value={form.slotId} onChange={(event) => {
                const slot = options.timeSlots.find((item) => String(item.id) === event.target.value)
                setForm((current) => ({ ...current, slotId: event.target.value, startTime: slot?.startTime || '', endTime: slot?.endTime || '' }))
                setModalError('')
              }}>
                <option value="" disabled>Chọn slot học</option>
                {options.timeSlots.map((slot) => <option key={slot.id} value={slot.id}>Slot {slot.id}: {slot.startTime} – {slot.endTime}</option>)}
              </select></span></label>
              <p id="class-slot-help">{selectedSlot
                ? `Chọn giờ học trong khoảng ${selectedSlot.startTime} – ${selectedSlot.endTime}. Giờ kết thúc phải sau giờ bắt đầu.`
                : 'Chọn slot trước khi chọn giờ bắt đầu và kết thúc.'}</p>
              <div className="service-form-grid">
                <label>Giờ bắt đầu <span className="input-wrap"><input required type="time" disabled={!selectedSlot} min={selectedSlot?.startTime} max={selectedSlot?.endTime} step="60" aria-describedby="class-slot-help" value={form.startTime} onChange={(event) => handleTimeChange('startTime', event.target.value)} /></span></label>
                <label>Giờ kết thúc <span className="input-wrap"><input required type="time" disabled={!selectedSlot} min={form.startTime || selectedSlot?.startTime} max={selectedSlot?.endTime} step="60" aria-describedby="class-slot-help" value={form.endTime} onChange={(event) => handleTimeChange('endTime', event.target.value)} /></span></label>
                <label>Sức chứa <span className="input-wrap"><input required type="number" min="1" value={form.maxCapacity} onChange={(event) => setForm({ ...form, maxCapacity: event.target.value })} /></span></label>
                <label>Học phí (VND) <span className="input-wrap"><input required type="number" min="0" step="1000" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></span></label>
                <label>Ngày bắt đầu <span className="input-wrap"><input required type="date" min="0001-01-01" max="9999-12-31" aria-invalid={Boolean(form.startDate && termErrors.startDate)} aria-describedby="class-start-date-help class-start-date-error" value={form.startDate} onChange={(event) => { setForm({ ...form, startDate: event.target.value }); setModalError('') }} /></span></label>
                <label>Số tuần học <span className="input-wrap"><input required type="number" min="1" max="2147483647" step="1" aria-invalid={Boolean(form.durationWeeks && termErrors.durationWeeks)} aria-describedby="class-duration-error" value={form.durationWeeks} onChange={(event) => { setForm({ ...form, durationWeeks: event.target.value }); setModalError('') }} /></span></label>
              </div>
              <p className="mb-0" role="status">Ngày kết thúc dự kiến: <strong>{previewEndDate ? formatClassDate(previewEndDate) : 'Chưa thiết lập'}</strong></p>
              <p id="class-start-date-help" className="mb-0">Ngày bắt đầu là buổi học đầu tiên. Tuần chứa ngày này là tuần thứ nhất; lớp kết thúc vào Chủ Nhật của tuần cuối.</p>
              {form.startDate && termErrors.startDate && <p id="class-start-date-error" className="field-error mb-0" role="alert">{termErrors.startDate}</p>}
              {form.durationWeeks && termErrors.durationWeeks && <p id="class-duration-error" className="field-error mb-0" role="alert">{termErrors.durationWeeks}</p>}
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
            ['Sức chứa', detail.maxCapacity], ['Học phí', detail.price], ['Ngày bắt đầu', formatClassDate(detail.startDate)],
            ['Số tuần học', detail.durationWeeks == null ? 'Chưa thiết lập' : `${detail.durationWeeks} tuần`],
            ['Ngày kết thúc', formatClassDate(detail.endDate)],
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
