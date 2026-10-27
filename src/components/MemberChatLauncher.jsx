import { lazy, Suspense, useState } from 'react'

const MemberChat = lazy(() => import('../pages/MemberChat'))

export default function MemberChatLauncher() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <Suspense fallback={<div className="member-chat-widget-loading" role="status">Đang mở hộp chat...</div>}>
          <MemberChat embedded onClose={() => setOpen(false)} />
        </Suspense>
      )}
      <button
        aria-expanded={open}
        aria-label={open ? 'Đóng hộp chat' : 'Mở hộp chat với huấn luyện viên'}
        className={`member-chat-launcher${open ? ' member-chat-launcher-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        title={open ? 'Đóng chat' : 'Chat với huấn luyện viên'}
        type="button"
      >
        <span className="material-symbols-outlined" aria-hidden="true">{open ? 'close' : 'chat'}</span>
        {!open && <span>Chat với HLV</span>}
      </button>
    </>
  )
}
