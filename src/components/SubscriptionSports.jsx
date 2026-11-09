import { useEffect, useState } from 'react'
import { getMemberPackage } from '../services/memberPackageService'
import { readSports } from '../utils/subscriptionSports'

export default function SubscriptionSports({ subscription, memberId }) {
  const { packageId, subscriptionId } = subscription
  const saved = readSports(memberId, subscriptionId)
  const hasSnapshot = Boolean(saved)
  const [detail, setDetail] = useState(null)
  useEffect(() => {
    if (hasSnapshot) return
    const controller = new AbortController()
    getMemberPackage(packageId, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setDetail({ packageId, data })
    }).catch(() => {
      if (!controller.signal.aborted) setDetail({ packageId, error: true })
    })
    return () => controller.abort()
  }, [hasSnapshot, packageId])

  if (!saved && detail?.packageId !== packageId) return <p role="status">Đang tải môn học…</p>
  if (!saved && detail?.error) return <p>Chưa tải được thông tin môn học của gói.</p>
  const included = saved?.included ?? (detail.data.includedSports || []).map(s => s.name)
  const groups = saved ? [] : detail.data.choiceGroups || []
  return <div className="subscription-sports">
    {!saved && <small>Môn học theo cấu hình hiện tại của gói</small>}
    {included.length > 0 && <p><strong>Môn bắt buộc:</strong> {included.join(', ')}</p>}
    {saved?.selected.length > 0 && <p><strong>Môn tự chọn đã đăng ký:</strong> {saved.selected.join(', ')}</p>}
    {groups.map(group => <p key={group.id}><strong>{group.name} · Môn tự chọn:</strong> {group.sports.map(s => s.name).join(', ')}</p>)}
    {groups.length > 0 && <small>Chưa có thông tin xác nhận môn bạn đã chọn cho lần đăng ký này.</small>}
    {!included.length && !saved?.selected.length && !groups.length && <p>Không có môn học đi kèm{saved ? '.' : ' trong cấu hình hiện tại.'}</p>}
  </div>
}
