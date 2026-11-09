import { useState } from 'react'
import Modal from './Modal'
import FreezeMonthsField from './FreezeMonthsField'
import { createPackage, getPackages, updatePackage } from '../services/packageService'
import { GYM_COACHED, GYM_SOLO } from '../utils/gymPackages'

export default function GymPackageForm({ packages, onClose, onSaved }) {
  const solo = packages.find(item => item.name === GYM_SOLO)
  const coached = packages.find(item => item.name === GYM_COACHED)
  const [duration, setDuration] = useState(solo?.durationMonths ?? coached?.durationMonths ?? 1)
  const [coachEnabled, setCoachEnabled] = useState(Boolean(coached && coached.status?.toLowerCase() === 'active'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    const common = { durationMonths: Number(fields.get('months')), status: fields.get('status'), discount: 0 }
    const variants = [{ name: GYM_SOLO, price: Number(fields.get('solo')), description: 'Tự tập tại phòng Gym.' }]
    if (coachEnabled) variants.push({ name: GYM_COACHED, price: Number(fields.get('coached')), description: `${fields.get('sessions')} buổi tập 1–1 với huấn luyện viên.` })
    setBusy(true)
    setError('')
    try {
      // Re-read on every attempt so a partial save can be resumed by ID.
      const { data } = await getPackages({})
      for (const variant of variants) {
        const existing = data.find(item => item.name === variant.name)
        const field = variant.name === GYM_SOLO ? 'soloFreezeMonths' : 'coachedFreezeMonths'
        const payload = { ...common, ...variant, freezeMonths: common.durationMonths >= 6 ? Number(fields.get(field)) : 0 }
        if (existing) await updatePackage(existing.id, payload)
        else await createPackage(payload)
      }
      if (!coachEnabled && coached?.status?.toLowerCase() === 'active') {
        await updatePackage(coached.id, {
          ...common,
          name: GYM_COACHED,
          description: coached.description || 'Gói Gym có huấn luyện viên 1–1.',
          price: Number(coached.price),
          freezeMonths: Number(coached.freezeMonths) || 0,
          status: 'Inactive',
        })
      }
      onSaved()
    } catch (cause) {
      setError(cause.response?.data?.message || 'Chưa lưu đủ hai lựa chọn Gym. Vui lòng thử lưu lại.')
    } finally {
      setBusy(false)
    }
  }

  return <Modal title="Cấu hình gói Gym" busy={busy} onClose={onClose}>
    <form className="auth-form subject-form service-form" onSubmit={save}>
      <label>Thời hạn (tháng)<input required name="months" type="number" min="1" value={duration} onChange={event => setDuration(event.target.value)} /></label>
      {duration >= 6 && <>
        <FreezeMonthsField name="soloFreezeMonths" label="Số tháng được bảo lưu khi tự tập" defaultValue={solo?.freezeMonths ?? 0} />
        {coachEnabled && <FreezeMonthsField name="coachedFreezeMonths" label="Số tháng được bảo lưu khi có huấn luyện viên" defaultValue={coached?.freezeMonths ?? 0} />}
      </>}
      <label>Giá tự tập (VNĐ)<input required name="solo" type="number" min="1" max="9999999999" defaultValue={solo?.price} /></label>
      <label className="gym-coach-toggle"><input type="checkbox" checked={coachEnabled} onChange={event => setCoachEnabled(event.target.checked)} />
        <span><strong>Cho phép hội viên chọn huấn luyện viên 1–1</strong><small>Khi tắt, lựa chọn có huấn luyện viên sẽ tạm ngưng cung cấp.</small></span>
      </label>
      {coachEnabled && <>
        <label>Giá có huấn luyện viên (VNĐ)<input required name="coached" type="number" min="1" max="9999999999" defaultValue={coached?.price} /></label>
        <label>Số buổi tập 1–1<input required name="sessions" type="number" min="1" defaultValue={coached?.description?.match(/^(\d+) buổi/)?.[1] || 1} /></label>
      </>}
      <label>Trạng thái<select name="status" defaultValue={solo?.status ?? coached?.status ?? 'Active'}>
        <option value="Active">Đang mở bán</option><option value="Inactive">Tạm ngưng cung cấp</option>
      </select></label>
      {error && <p role="alert">{error}</p>}
      <button className="subject-button subject-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu gói Gym'}</button>
    </form>
  </Modal>
}
