import { useEffect, useRef, useState } from 'react'
import { getNotifications, getUnreadSummary, markNotificationRead } from '../services/memberNotificationService'
import { useLanguage } from '../utils/language'
import './MemberNotificationBell.css'

export default function MemberNotificationBell() {
  const english = useLanguage() === 'en'
  const title = english ? 'Notifications' : 'Thông báo'
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [count, setCount] = useState(0)
  const [result, setResult] = useState(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [readFailed, setReadFailed] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const load = open ? getNotifications(page, signal) : getUnreadSummary(signal)
    load.then(data => {
      if (signal.aborted) return
      setCount(data.unreadCount)
      if (open) setResult(data)
    }).catch(() => {
      if (!signal.aborted && open) setFailed(true)
    })
    return () => controller.abort()
  }, [open, page, attempt])

  useEffect(() => {
    if (!open) return
    const outside = event => {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    const escape = event => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  function showPage(next) {
    setResult(null)
    setFailed(false)
    setReadFailed(false)
    setPage(next)
    setAttempt(value => value + 1)
  }

  async function read(id) {
    setSaving(true)
    setReadFailed(false)
    try {
      const { notification, unreadCount } = await markNotificationRead(id)
      setCount(unreadCount)
      setResult(current => current && ({
        ...current, items: current.items.map(item => item.id === id ? notification : item),
      }))
    } catch {
      setReadFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return <div className="member-bell" ref={root}>
    <button type="button" ref={trigger} className="notification-button" aria-expanded={open}
      title={title} aria-label={count ? `${title} (${count} ${english ? 'unread' : 'chưa đọc'})` : title}
      onClick={() => { if (!open) showPage(0); setOpen(!open) }}>
      <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
      {count > 0 && <span className="member-bell-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
    </button>
    {open && <section className="member-bell-panel" aria-label={title}>
      <h2>{title}</h2>
      {failed ? <p role="alert">{english ? 'Could not load notifications.' : 'Chưa tải được thông báo.'} <button onClick={() => showPage(page)}>{english ? 'Retry' : 'Thử lại'}</button></p>
        : !result ? <p role="status">{english ? 'Loading…' : 'Đang tải…'}</p>
        : result.items.length === 0 ? <p>{english ? 'No notifications yet.' : 'Bạn chưa có thông báo.'}</p>
        : <ul>{result.items.map(item => {
          const content = <><strong>{item.title}</strong><span>{item.message}</span>
            <small>{new Date(item.createdAt).toLocaleString(english ? 'en-GB' : 'vi-VN', {dateStyle: 'short', timeStyle: 'short'})}</small></>
          return <li key={item.id}>{item.read ? <div>{content}</div> :
            <button type="button" disabled={saving} onClick={() => read(item.id)}
              title={english ? 'Mark as read' : 'Đánh dấu đã đọc'}>{content}</button>}</li>
        })}</ul>}
      {readFailed && <p role="alert">{english ? 'Could not mark as read. Please try again.' : 'Chưa đánh dấu được thông báo. Vui lòng thử lại.'}</p>}
      {result && (page > 0 || result.hasNext) && <footer>
        <button disabled={saving || page === 0} onClick={() => showPage(page - 1)}>{english ? 'Previous' : 'Trang trước'}</button>
        <span>{page + 1} / {Math.ceil(result.totalElements / 10)}</span>
        <button disabled={saving || !result.hasNext} onClick={() => showPage(page + 1)}>{english ? 'Next' : 'Trang sau'}</button>
      </footer>}
    </section>}
  </div>
}
