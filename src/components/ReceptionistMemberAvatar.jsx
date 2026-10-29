import { useState } from 'react'
import { resolveAvatarUrl } from '../services/memberProfileService'

export default function ReceptionistMemberAvatar({ member, size = 'medium' }) {
  const src = resolveAvatarUrl(member?.avatarUrl)
  const [failedSrc, setFailedSrc] = useState('')
  const label = member?.fullName || member?.username || 'Hội viên'
  const initials = label.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toLocaleUpperCase('vi-VN')

  return (
    <span className={`receptionist-member-avatar is-${size}`} role="img" aria-label={`Ảnh đại diện ${label}`}>
      {src && src !== failedSrc
        ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} />
        : <span aria-hidden="true">{initials || '•'}</span>}
    </span>
  )
}
