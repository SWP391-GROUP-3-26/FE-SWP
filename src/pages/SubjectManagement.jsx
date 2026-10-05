import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import Modal from '../components/Modal'
import { staffMenuItems } from '../components/staffMenuItems'
import { getRole } from '../auth/authStorage'
import { SUBJECT_CATEGORIES } from '../constants/subjectCategories'
import { createSubject, deleteSubject, getSubjectById, getSubjects } from '../services/subjectService'
import './SubjectManagement.css'

function errorMessage(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  return error.response?.data?.message || (error.request ? 'Không thể kết nối máy chủ. Vui lòng thử lại.' : error.message) || 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

export default function SubjectManagement() {
  const role = getRole()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', category: '', description: '' })
  const [modalError, setModalError] = useState('')
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const listController = useRef(null)
  const detailController = useRef(null)

  const loadSubjects = useCallback(async () => {
    listController.current?.abort()
    const controller = new AbortController()
    listController.current = controller
    setLoading(true)
    setListError('')
    try {
      const result = await getSubjects(controller.signal)
      if (!controller.signal.aborted) setSubjects(result.data)
    } catch (error) {
      if (!controller.signal.aborted) setListError(errorMessage(error))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Quản lý Môn học - SereneDesk'
    // Start loading asynchronously; abort requests on navigation and StrictMode cleanup.
    const timer = setTimeout(() => { void loadSubjects() }, 0)
    return () => {
      clearTimeout(timer)
      listController.current?.abort()
      detailController.current?.abort()
      document.title = previousTitle
    }
  }, [loadSubjects])

  function closeModal() {
    detailController.current?.abort()
    setModal(null)
    setModalError('')
  }

  function openModal(type, subject) {
    setModalError('')
    setForm({ name: '', category: '', description: '' })
    setModal({ type, subject })
  }

  async function loadDetail(subject) {
    detailController.current?.abort()
    const controller = new AbortController()
    detailController.current = controller
    setDetail(null)
    setModalError('')
    setDetailLoading(true)
    try {
      const result = await getSubjectById(subject.id, controller.signal)
      if (!controller.signal.aborted) setDetail(result)
    } catch (error) {
      if (!controller.signal.aborted) setModalError(errorMessage(error))
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false)
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    if (busy) return
    const data = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))
    if (!data.name || !categoryOptions.includes(data.category)) {
      setModalError('Vui lòng nhập tên môn học và chọn danh mục hợp lệ.')
      return
    }
    setBusy(true)
    setModalError('')
    try {
      await createSubject(data)
      closeModal()
      setNotice('Thêm môn học thành công.')
      await loadSubjects()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (busy) return
    const subject = modal.subject
    setBusy(true)
    setModalError('')
    try {
      await deleteSubject(subject.id)
      setSubjects((current) => current.filter((item) => item.id !== subject.id))
      closeModal()
      setNotice(`Đã xóa môn học “${subject.name}”.`)
      await loadSubjects()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const categories = [...new Set(subjects.map((subject) => subject.category).filter(Boolean))].sort()
  const categoryOptions = [...new Set([...SUBJECT_CATEGORIES, ...categories])]
  const query = search.trim().toLocaleLowerCase('vi')
  const filtered = subjects.filter((subject) =>
    (!category || subject.category === category) &&
    [subject.id, subject.code, subject.name, subject.category, subject.description]
      .some((value) => String(value ?? '').toLocaleLowerCase('vi').includes(query)))

  return (
    <DashboardLayout role={role} menuItems={staffMenuItems[role] || []}
      eyebrow="SereneDesk / Môn học" title="Quản lý Môn học"
      subtitle="Quản lý danh mục môn học, thông tin và nội dung các bộ môn tại trung tâm.">
      {notice && <div className="auth-notice subject-notice" role="status">
        <span>{notice}</span>
        <button className="icon-button" aria-label="Đóng thông báo" onClick={() => setNotice('')} type="button">×</button>
      </div>}
      <section className="dashboard-panel subject-panel" aria-label="Danh sách môn học" aria-busy={loading}>
        <div className="panel-heading subject-heading">
          <div><h3>Danh sách môn học</h3><p>{subjects.length} môn học</p></div>
          <button className="subject-button subject-primary" type="button" onClick={() => openModal('create')}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span>Thêm môn học
          </button>
        </div>
        <div className="subject-toolbar">
          <label className="subject-search"><span className="visually-hidden">Tìm kiếm môn học</span>
            <span className="input-wrap"><span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input type="search" placeholder="Tìm tên, mã hoặc mô tả môn học..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </span>
          </label>
          <label className="subject-filter"><span className="visually-hidden">Lọc danh mục</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Tất cả danh mục</option>
              {category && !categories.includes(category) && <option value={category}>{category}</option>}
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
        {listError && <div className="auth-error subject-notice" role="alert">
          <span>{listError}</span><button className="subject-button" disabled={loading} onClick={loadSubjects} type="button">Thử lại</button>
        </div>}
        {loading && <div className="subject-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang tải môn học...</div>}
        <div className="subject-table-scroll" tabIndex={0} role="region" aria-label="Bảng môn học, cuộn ngang trên màn hình nhỏ">
          <table className="subject-table">
            <thead><tr>{['ID', 'Mã môn học', 'Tên môn học', 'Danh mục', 'Mô tả', 'Thao tác'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>
              {filtered.map((subject) => <tr key={subject.id}>
                <td>{subject.id}</td><td><code>{subject.code || '—'}</code></td>
                <th scope="row">{subject.name}</th><td><span className="subject-category">{subject.category || '—'}</span></td>
                <td className="subject-description">{subject.description || '—'}</td>
                <td><div className="subject-actions">
                  <button className="subject-button" type="button" aria-label={`Xem môn học ${subject.name}`}
                    onClick={() => { openModal('detail', subject); void loadDetail(subject) }}>Xem</button>
                  <button className="subject-button subject-delete" type="button" aria-label={`Xóa môn học ${subject.name}`}
                    onClick={() => openModal('delete', subject)}>Xóa</button>
                </div></td>
              </tr>)}
              {!loading && !listError && filtered.length === 0 && <tr><td colSpan={6} className="subject-empty">
                <span className="material-symbols-outlined" aria-hidden="true">menu_book</span>
                <p>{subjects.length ? 'Không tìm thấy môn học phù hợp.' : 'Chưa có môn học nào.'}</p>
                {subjects.length > 0 && <button className="subject-button" type="button" onClick={() => { setSearch(''); setCategory('') }}>Xóa bộ lọc</button>}
              </td></tr>}
            </tbody>
          </table>
        </div>
        <p className="subject-count">Hiển thị {filtered.length} / {subjects.length} môn học</p>
      </section>
      {modal && <Modal title={modal.type === 'create' ? 'Thêm môn học' : modal.type === 'delete' ? 'Xóa môn học' : 'Chi tiết môn học'} busy={busy} onClose={closeModal}>
        {modalError && <div className="auth-error subject-modal-error" role="alert">{modalError}</div>}
        {modal.type === 'create' && <form className="auth-form subject-form" onSubmit={handleCreate}>
          <fieldset disabled={busy}>
            <label>Tên môn học <span className="input-wrap"><input autoFocus required name="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></span></label>
            <label>Danh mục <span className="input-wrap">
              <select required name="category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                <option value="" disabled>Chọn danh mục</option>
                {categoryOptions.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </span></label>
            <label>Mô tả <textarea name="description" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          </fieldset>
          <div className="subject-modal-actions"><button className="subject-button" disabled={busy} type="button" onClick={closeModal}>Hủy</button>
            <button className="subject-button subject-primary" disabled={busy || !form.category} type="submit">{busy ? 'Đang lưu...' : 'Thêm môn học'}</button></div>
        </form>}
        {modal.type === 'delete' && <>
          <p>Bạn có chắc muốn xóa môn học <strong>“{modal.subject.name}”</strong>?</p>
          <p className="subject-count">Thao tác này không thể hoàn tác.</p>
          <div className="subject-modal-actions"><button className="subject-button" disabled={busy} type="button" onClick={closeModal}>Hủy</button>
            <button className="subject-button subject-danger" disabled={busy} type="button" onClick={handleDelete}>{busy ? 'Đang xóa...' : 'Xác nhận xóa'}</button></div>
        </>}
        {modal.type === 'detail' && <>
          {detailLoading && <div className="subject-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang tải chi tiết...</div>}
          {detail && <dl className="subject-detail">{[['ID', detail.id], ['Mã môn học', detail.code], ['Tên môn học', detail.name], ['Danh mục', detail.category], ['Mô tả', detail.description]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || value === 0 ? value : '—'}</dd></div>)}</dl>}
          <div className="subject-modal-actions">{modalError && <button className="subject-button" type="button" onClick={() => loadDetail(modal.subject)}>Thử lại</button>}
            <button className="subject-button" type="button" onClick={closeModal}>Đóng</button></div>
        </>}
      </Modal>}
    </DashboardLayout>
  )
}
