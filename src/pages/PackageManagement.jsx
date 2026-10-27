import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import Modal from '../components/Modal'
import { staffMenuItems } from '../components/staffMenuItems'
import { getRole } from '../auth/authStorage'
import { getSubjects } from '../services/subjectService'
import {
  createPackage,
  deletePackage,
  getPackageById,
  getPackages,
  updatePackage,
} from '../services/packageService'
import './ServiceManagement.css'
import './SubjectManagement.css'

/* ─── Constants ─────────────────────────────────────────────── */

const DURATION_OPTIONS = [
  { label: '1 tháng',   value: 1  },
  { label: '3 tháng',   value: 3  },
  { label: '6 tháng',   value: 6  },
  { label: '12 tháng',  value: 12 },
  { label: '24 tháng',  value: 24 },
]

const STATUS_OPTIONS = [
  { label: 'Đang mở bán',         value: 'Active'   },
  { label: 'Tạm ngưng cung cấp',  value: 'Inactive' },
]

const EMPTY_FORM = {
  name: '',
  description: '',
  durationMonths: 1,
  price: '',
  status: 'Active',
  includedClasses: '',
  benefits: '',
  discount: 0,
  termConditions: '',
  includedSportIds: [],
  choiceGroups: [],
}

/* ─── Helpers ────────────────────────────────────────────────── */

function errorMessage(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  return (
    error.response?.data?.message ||
    (error.request ? 'Không thể kết nối máy chủ. Vui lòng thử lại.' : error.message) ||
    'Đã xảy ra lỗi. Vui lòng thử lại.'
  )
}

function formatCurrency(value) {
  if (value == null) return '—'
  return Number(value).toLocaleString('vi-VN') + ' đ'
}

function StatusBadge({ status }) {
  const isActive = String(status).toLowerCase() === 'active'
  return (
    <span className={`service-status${isActive ? ' active' : ''}`}>
      {isActive ? 'Đang mở bán' : 'Tạm ngưng'}
    </span>
  )
}

/* ─── Component ──────────────────────────────────────────────── */

export default function PackageManagement() {
  const role = getRole()

  // List state
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Modal state
  const [modal, setModal] = useState(null)          // null | { type: 'create'|'edit'|'detail'|'delete', pkg? }
  const [form, setForm] = useState(EMPTY_FORM)
  const [modalError, setModalError] = useState('')
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [subjectsError, setSubjectsError] = useState('')
  const [replaceBenefits, setReplaceBenefits] = useState(false)

  const listController  = useRef(null)
  const detailController = useRef(null)

  /* ── Load list ── */
  const loadPackages = useCallback(async () => {
    listController.current?.abort()
    const controller = new AbortController()
    listController.current = controller
    setLoading(true)
    setListError('')
    try {
      const result = await getPackages({}, controller.signal)
      if (!controller.signal.aborted) setPackages(result.data)
    } catch (error) {
      if (!controller.signal.aborted) setListError(errorMessage(error))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Quản lý gói dịch vụ - UniSports'
    const timer = setTimeout(() => { void loadPackages() }, 0)
    return () => {
      clearTimeout(timer)
      listController.current?.abort()
      detailController.current?.abort()
      document.title = prevTitle
    }
  }, [loadPackages])

  useEffect(() => {
    const controller = new AbortController()
    getSubjects(controller.signal).then((result) => {
      if (!controller.signal.aborted) setSubjects(result.data || [])
    }).catch((error) => {
      if (!controller.signal.aborted) setSubjectsError(errorMessage(error))
    })
    return () => controller.abort()
  }, [])

  /* ── Modal helpers ── */
  function closeModal() {
    detailController.current?.abort()
    setModal(null)
    setModalError('')
    setDetail(null)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setReplaceBenefits(true)
    setModalError('')
    setModal({ type: 'create' })
  }

  function openEdit(pkg) {
    setForm({
      name: pkg.name ?? '',
      description: pkg.description ?? '',
      durationMonths: pkg.durationMonths ?? 1,
      price: pkg.price != null ? String(pkg.price) : '',
      status: pkg.status ?? 'Active',
      includedClasses: pkg.includedClasses != null ? String(pkg.includedClasses) : '',
      benefits: pkg.benefits ?? '',
      discount: pkg.discount ?? 0,
      termConditions: pkg.termConditions ?? '',
      includedSportIds: [],
      choiceGroups: [],
    })
    setReplaceBenefits(false)
    setModalError('')
    setModal({ type: 'edit', pkg })
  }

  function openDetail(pkg) {
    setDetail(null)
    setModalError('')
    setModal({ type: 'detail', pkg })
    loadDetail(pkg)
  }

  function updateGroup(index, key, value) {
    setForm((current) => ({
      ...current,
      choiceGroups: current.choiceGroups.map((group, groupIndex) =>
        groupIndex === index ? { ...group, [key]: value } : group),
    }))
  }

  function toggleSport(listKey, sportId) {
    setForm((current) => {
      const selected = current[listKey] || []
      return { ...current, [listKey]: selected.includes(sportId)
        ? selected.filter((id) => id !== sportId) : [...selected, sportId] }
    })
  }

  function toggleGroupSport(index, sportId) {
    setForm((current) => ({
      ...current,
      choiceGroups: current.choiceGroups.map((group, groupIndex) => {
        if (groupIndex !== index) return group
        const sportIds = group.sportIds || []
        return { ...group, sportIds: sportIds.includes(sportId)
          ? sportIds.filter((id) => id !== sportId) : [...sportIds, sportId] }
      }),
    }))
  }

  function validateBenefits() {
    const invalidGroup = form.choiceGroups.find((group) =>
      !group.groupName.trim() || !group.requiredSelection || group.sportIds.length < Number(group.requiredSelection))
    if (invalidGroup) {
      setModalError(`Nhóm “${invalidGroup.groupName || 'chưa đặt tên'}” cần có tên và đủ số môn theo yêu cầu.`)
      return false
    }
    return true
  }

  function openDelete(pkg) {
    setModalError('')
    setModal({ type: 'delete', pkg })
  }

  /* ── Load detail ── */
  async function loadDetail(pkg) {
    detailController.current?.abort()
    const controller = new AbortController()
    detailController.current = controller
    setDetailLoading(true)
    try {
      const result = await getPackageById(pkg.id, controller.signal)
      if (!controller.signal.aborted) setDetail(result)
    } catch (error) {
      if (!controller.signal.aborted) setModalError(errorMessage(error))
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false)
    }
  }

  /* ── Field helper ── */
  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /* ── Create ── */
  async function handleCreate(event) {
    event.preventDefault()
    if (busy) return
    const price = parseFloat(form.price)
    if (!form.name.trim()) { setModalError('Vui lòng nhập tên gói dịch vụ.'); return }
    if (isNaN(price) || price <= 0) { setModalError('Vui lòng nhập giá niêm yết hợp lệ (lớn hơn 0).'); return }
    if (!validateBenefits()) return

    setBusy(true)
    setModalError('')
    try {
      await createPackage({
        name: form.name.trim(),
        description: form.description.trim() || null,
        durationMonths: Number(form.durationMonths),
        price,
        status: form.status,
        includedClasses: form.includedClasses !== '' ? Number(form.includedClasses) : 0,
        benefits: form.benefits.trim() || null,
        discount: Number(form.discount) || 0,
        termConditions: form.termConditions.trim() || null,
        includedSportIds: form.includedSportIds,
        choiceGroups: form.choiceGroups.map((group, index) => ({ ...group, sortOrder: index })),
      })
      closeModal()
      setNotice('Tạo gói dịch vụ thành công.')
      await loadPackages()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  /* ── Update ── */
  async function handleUpdate(event) {
    event.preventDefault()
    if (busy) return
    const price = parseFloat(form.price)
    if (!form.name.trim()) { setModalError('Vui lòng nhập tên gói dịch vụ.'); return }
    if (isNaN(price) || price <= 0) { setModalError('Vui lòng nhập giá niêm yết hợp lệ (lớn hơn 0).'); return }
    if (replaceBenefits && !validateBenefits()) return

    setBusy(true)
    setModalError('')
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        durationMonths: Number(form.durationMonths),
        price,
        status: form.status,
        includedClasses: form.includedClasses !== '' ? Number(form.includedClasses) : 0,
        benefits: form.benefits.trim() || null,
        discount: Number(form.discount) || 0,
        termConditions: form.termConditions.trim() || null,
      }
      if (replaceBenefits) {
        payload.includedSportIds = form.includedSportIds
        payload.choiceGroups = form.choiceGroups.map((group, index) => ({ ...group, sortOrder: index }))
      }
      await updatePackage(modal.pkg.id, payload)
      closeModal()
      setNotice(`Cập nhật gói "${form.name.trim()}" thành công.`)
      await loadPackages()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (busy) return
    const pkg = modal.pkg
    setBusy(true)
    setModalError('')
    try {
      await deletePackage(pkg.id)
      closeModal()
      setNotice(`Đã xoá gói dịch vụ "${pkg.name}".`)
      await loadPackages()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  /* ── Client-side filter ── */
  const query = search.trim().toLocaleLowerCase('vi')
  const filtered = packages.filter((pkg) => {
    const matchStatus = !statusFilter || pkg.status?.toLowerCase() === statusFilter.toLowerCase()
    const matchSearch = !query || [pkg.code, pkg.name, pkg.description, pkg.benefits]
      .some((v) => String(v ?? '').toLocaleLowerCase('vi').includes(query))
    return matchStatus && matchSearch
  })

  /* ── Shared form fields ── */
  function PackageFormFields() {
    return (
      <fieldset disabled={busy}>
        <label>
          Tên gói dịch vụ <span className="input-wrap">
            <input
              autoFocus required name="name"
              placeholder="VD: Gói VIP Toàn Diện Aqua & Gym"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </span>
        </label>
        <label>
          Mô tả chi tiết &amp; đặc quyền
          <textarea
            name="description" rows={4}
            placeholder="Bao gồm truy quyền sử dụng hồ bơi khóa ẩm, phòng gym chuyên sâu..."
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
          />
        </label>
        <div className="service-form-grid">
          <label>
            Thời gian hiệu lực <span className="input-wrap">
              <select
                required name="durationMonths"
                value={form.durationMonths}
                onChange={(e) => setField('durationMonths', Number(e.target.value))}
              >
                {DURATION_OPTIONS.map(({ label, value }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </span>
          </label>
          <label>
            Giá niêm yết (VNĐ) <span className="input-wrap">
              <input
                required type="number" min="1" step="1000" name="price"
                placeholder="VD: 6800000"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
              />
            </span>
          </label>
        </div>
        <label>
          Trạng thái phát hành <span className="input-wrap">
            <select
              required name="status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
            >
              {STATUS_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </span>
        </label>
        <label>
          Chiết khấu (%) <span className="input-wrap">
            <input type="number" min="0" max="100" step="0.1" value={form.discount}
              onChange={(e) => setField('discount', e.target.value)} />
          </span>
        </label>
        <label>
          Số buổi học bao gồm <span className="input-wrap">
            <input
              type="number" min="0" name="includedClasses"
              placeholder="0 (không giới hạn)"
              value={form.includedClasses}
              onChange={(e) => setField('includedClasses', e.target.value)}
            />
          </span>
        </label>
        <label>
          Đặc quyền bổ sung
          <textarea
            name="benefits" rows={2}
            placeholder="VD: Tặng 1 buổi PT cá nhân, ưu đãi giảm 10%..."
            value={form.benefits}
            onChange={(e) => setField('benefits', e.target.value)}
          />
        </label>
        <label>
          Điều khoản và điều kiện
          <textarea rows={3} value={form.termConditions}
            onChange={(e) => setField('termConditions', e.target.value)} />
        </label>
        {modal.type === 'edit' && (
          <div className="package-benefit-replace-note">
            <label className="package-benefit-replace-toggle">
              <input type="checkbox" checked={replaceBenefits} onChange={(event) => {
                setReplaceBenefits(event.target.checked)
                if (event.target.checked) setForm((current) => ({ ...current, includedSportIds: [], choiceGroups: [] }))
              }} />
              Thay thế danh sách môn và nhóm lựa chọn của gói
            </label>
            <p>API chi tiết hiện chưa trả cấu hình môn đang lưu. Bật tùy chọn này sẽ thay toàn bộ cấu hình hiện tại bằng danh sách bên dưới.</p>
          </div>
        )}
        {(modal.type === 'create' || replaceBenefits) && (
          <div className="package-benefit-editor">
            <section>
              <div className="package-benefit-editor-heading">
                <div><strong>Môn học được bao gồm</strong><small>Hội viên không cần chọn lại khi đăng ký.</small></div>
              </div>
              {subjectsError && <p className="auth-error" role="alert">{subjectsError}</p>}
              <div className="package-sport-picker">
                {subjects.map((subject) => (
                  <label key={subject.id}>
                    <input type="checkbox" checked={form.includedSportIds.includes(subject.id)}
                      onChange={() => toggleSport('includedSportIds', subject.id)} />
                    {subject.name}
                  </label>
                ))}
                {!subjectsError && !subjects.length && <small>Chưa có môn học để chọn.</small>}
              </div>
            </section>
            <section>
              <div className="package-benefit-editor-heading">
                <div><strong>Nhóm môn hội viên tự chọn</strong><small>Mỗi nhóm có số lượng môn bắt buộc riêng.</small></div>
                <button className="subject-button" type="button" onClick={() => setForm((current) => ({
                  ...current, choiceGroups: [...current.choiceGroups, {
                    groupName: '', description: '', requiredSelection: 1, sportIds: [],
                  }],
                }))}>Thêm nhóm</button>
              </div>
              {form.choiceGroups.map((group, index) => (
                <fieldset className="package-choice-group-editor" key={`choice-${index}`}>
                  <div className="package-choice-group-fields">
                    <label>Tên nhóm<input required value={group.groupName} onChange={(e) => updateGroup(index, 'groupName', e.target.value)} /></label>
                    <label>Số môn cần chọn<input type="number" min="1" max={Math.max(subjects.length, 1)} value={group.requiredSelection}
                      onChange={(e) => updateGroup(index, 'requiredSelection', Number(e.target.value))} /></label>
                    <button className="subject-button subject-delete" type="button" aria-label="Xóa nhóm" onClick={() => setForm((current) => ({
                      ...current, choiceGroups: current.choiceGroups.filter((_, groupIndex) => groupIndex !== index),
                    }))}>Xóa</button>
                  </div>
                  <label>Mô tả<input value={group.description || ''} onChange={(e) => updateGroup(index, 'description', e.target.value)} /></label>
                  <div className="package-sport-picker">
                    {subjects.map((subject) => (
                      <label key={subject.id}>
                        <input type="checkbox" checked={(group.sportIds || []).includes(subject.id)}
                          onChange={() => toggleGroupSport(index, subject.id)} />
                        {subject.name}
                      </label>
                    ))}
                  </div>
                  <small>Đã chọn {group.sportIds.length} môn · yêu cầu {group.requiredSelection}</small>
                </fieldset>
              ))}
              {!form.choiceGroups.length && <p className="subject-count">Gói này không yêu cầu hội viên chọn thêm môn.</p>}
            </section>
          </div>
        )}
      </fieldset>
    )
  }

  /* ── Render ── */
  return (
    <DashboardLayout
      role={role}
      menuItems={staffMenuItems[role] || []}
      eyebrow="Dịch vụ / Quản lý gói tập"
      title="Danh sách gói dịch vụ"
      subtitle="Theo dõi danh mục gói tập, thời hạn, giá niêm yết và trạng thái kinh doanh."
    >
      {/* Success notice */}
      {notice && (
        <div className="auth-notice subject-notice" role="status">
          <span>{notice}</span>
          <button className="icon-button" aria-label="Đóng thông báo" onClick={() => setNotice('')} type="button">×</button>
        </div>
      )}

      <section className="dashboard-panel service-panel" aria-label="Danh sách gói dịch vụ" aria-busy={loading}>
        {/* Header */}
        <div className="panel-heading service-heading subject-heading">
          <div>
            <h3>Danh sách gói dịch vụ</h3>
            <p>{packages.length} gói dịch vụ</p>
          </div>
          <button className="subject-button subject-primary" type="button" onClick={openCreate}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            Tạo mới gói tập
          </button>
        </div>

        {/* Toolbar */}
        <div className="service-toolbar">
          <label className="service-search subject-search">
            <span className="visually-hidden">Tìm kiếm gói dịch vụ</span>
            <span className="input-wrap">
              <span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input
                type="search"
                placeholder="Tìm theo tên gói, mã PKG hoặc nội dung đặc quyền..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </span>
          </label>
          <label className="service-filter">
            <span>Trạng thái:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả</option>
              {STATUS_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Error */}
        {listError && (
          <div className="auth-error subject-notice" role="alert">
            <span>{listError}</span>
            <button className="subject-button" disabled={loading} onClick={loadPackages} type="button">Thử lại</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="subject-loading" role="status">
            <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang tải gói dịch vụ...
          </div>
        )}

        {/* Table */}
        <div className="subject-table-scroll" tabIndex={0} role="region" aria-label="Bảng gói dịch vụ">
          <table className="subject-table service-table">
            <thead>
              <tr>
                {['Mã gói', 'Tên gói dịch vụ & đặc quyền', 'Thời hạn', 'Đơn giá niêm yết', 'Trạng thái', 'Thao tác']
                  .map((label) => <th key={label} scope="col">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((pkg) => (
                <tr key={pkg.id}>
                  <td><code>{pkg.code}</code></td>
                  <td>
                    <strong>{pkg.name}</strong>
                    {pkg.description && <small>{pkg.description}</small>}
                  </td>
                  <td>
                    <span className="subject-category">
                      {pkg.durationMonths ? `${pkg.durationMonths} tháng` : '—'}
                    </span>
                  </td>
                  <td><strong>{formatCurrency(pkg.price)}</strong></td>
                  <td><StatusBadge status={pkg.status} /></td>
                  <td>
                    <div className="subject-actions">
                      <button
                        className="subject-button" type="button"
                        aria-label={`Xem chi tiết gói ${pkg.name}`}
                        onClick={() => openDetail(pkg)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span>
                      </button>
                      <button
                        className="subject-button" type="button"
                        aria-label={`Chỉnh sửa gói ${pkg.name}`}
                        onClick={() => openEdit(pkg)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                      </button>
                      <button
                        className="subject-button subject-delete" type="button"
                        aria-label={`Xoá gói ${pkg.name}`}
                        onClick={() => openDelete(pkg)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !listError && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="subject-empty">
                    <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
                    <p>{packages.length ? 'Không tìm thấy gói dịch vụ phù hợp.' : 'Chưa có gói dịch vụ nào.'}</p>
                    {packages.length > 0 && (
                      <button className="subject-button" type="button"
                        onClick={() => { setSearch(''); setStatusFilter('') }}>
                        Xoá bộ lọc
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="subject-count">Hiển thị {filtered.length} / {packages.length} gói dịch vụ</p>
      </section>

      {/* ── Modals ── */}
      {modal && (
        <Modal
          title={
            modal.type === 'create' ? 'Tạo mới Gói dịch vụ' :
            modal.type === 'edit'   ? `Chỉnh sửa: ${modal.pkg?.name}` :
            modal.type === 'delete' ? 'Xoá gói dịch vụ' :
            'Chi tiết gói dịch vụ'
          }
          busy={busy}
          onClose={closeModal}
        >
          {modalError && <div className="auth-error subject-modal-error" role="alert">{modalError}</div>}

          {/* ── Create form ── */}
          {modal.type === 'create' && (
            <form className="auth-form subject-form service-form" onSubmit={handleCreate}>
              <PackageFormFields />
              <div className="subject-modal-actions">
                <button className="subject-button" disabled={busy} type="button" onClick={closeModal}>Huỷ bỏ</button>
                <button className="subject-button subject-primary" disabled={busy} type="submit">
                  {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}

          {/* ── Edit form ── */}
          {modal.type === 'edit' && (
            <form className="auth-form subject-form service-form" onSubmit={handleUpdate}>
              <PackageFormFields />
              <div className="subject-modal-actions">
                <button className="subject-button" disabled={busy} type="button" onClick={closeModal}>Huỷ bỏ</button>
                <button className="subject-button subject-primary" disabled={busy} type="submit">
                  {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}

          {/* ── Delete confirm ── */}
          {modal.type === 'delete' && (
            <>
              <p>Bạn có chắc muốn xoá gói dịch vụ <strong>"{modal.pkg?.name}"</strong>?</p>
              <p className="subject-count">Thao tác này không thể hoàn tác.</p>
              <div className="subject-modal-actions">
                <button className="subject-button" disabled={busy} type="button" onClick={closeModal}>Huỷ</button>
                <button className="subject-button subject-danger" disabled={busy} type="button" onClick={handleDelete}>
                  {busy ? 'Đang xoá...' : 'Xác nhận xoá'}
                </button>
              </div>
            </>
          )}

          {/* ── Detail view ── */}
          {modal.type === 'detail' && (
            <>
              {detailLoading && (
                <div className="subject-loading" role="status">
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang tải chi tiết...
                </div>
              )}
              {detail && (
                <>
                <dl className="subject-detail">
                  {[
                    ['Mã gói', detail.code],
                    ['Tên gói dịch vụ', detail.name],
                    ['Mô tả & đặc quyền', detail.description],
                    ['Đặc quyền bổ sung', detail.benefits],
                    ['Thời hạn', detail.durationMonths ? `${detail.durationMonths} tháng (${detail.durationDays} ngày)` : null],
                    ['Giá niêm yết', formatCurrency(detail.price)],
                    ['Số buổi học', detail.includedClasses != null ? `${detail.includedClasses} buổi` : '—'],
                    ['Trạng thái', detail.statusLabel],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || '—'}</dd>
                    </div>
                  ))}
                </dl>
                <section className="package-benefit-detail">
                  <h4>Môn học và nhóm lựa chọn</h4>
                  {detail.includedSports?.length ? (
                    <p><strong>Đã bao gồm:</strong> {detail.includedSports.map((sport) => sport.name).join(', ')}</p>
                  ) : <p>API chi tiết chưa trả danh sách môn được bao gồm.</p>}
                  {detail.choiceGroups?.length ? detail.choiceGroups.map((group) => (
                    <p key={group.id}><strong>{group.name} · chọn {group.requiredSelection}:</strong> {(group.sports || []).map((sport) => sport.name).join(', ')}</p>
                  )) : <p>API chi tiết chưa trả các nhóm môn tự chọn.</p>}
                </section>
                </>
              )}
              <div className="subject-modal-actions">
                {!detailLoading && detail && (
                  <button className="subject-button" type="button" onClick={() => openEdit(modal.pkg)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>edit</span>
                    Chỉnh sửa
                  </button>
                )}
                <button className="subject-button" type="button" onClick={closeModal}>Đóng</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </DashboardLayout>
  )
}
