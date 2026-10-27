import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import memberMenuItems from '../components/memberMenuItems'
import {
  chatErrorMessage,
  connectChatSocket,
  getChatContacts,
  getChatMessages,
  markChatRead,
  resolveChatMediaUrl,
  uploadChatImage,
} from '../services/chatService'
import './MemberChat.css'

const timeFormatter = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
const dateFormatter = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })

function initials(name = '') {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'HLV'
}

function dayKey(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatDay(value) {
  const date = new Date(value)
  const today = new Date()
  if (dayKey(date) === dayKey(today)) return 'Hôm nay'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (dayKey(date) === dayKey(yesterday)) return 'Hôm qua'
  return dateFormatter.format(date)
}

function mergeMessage(list, message) {
  if (!message?.messageId || list.some((item) => item.messageId === message.messageId)) return list
  return [...list, message].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

function ContactAvatar({ contact, small = false }) {
  const [broken, setBroken] = useState(false)
  const src = resolveChatMediaUrl(contact.avatarUrl)
  return (
    <span className={`chat-avatar${small ? ' chat-avatar-small' : ''}`}>
      {src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} referrerPolicy="no-referrer" />
        : initials(contact.fullName)}
    </span>
  )
}

export default function MemberChat({ embedded = false, onClose }) {
  const [contacts, setContacts] = useState([])
  const [activeContactId, setActiveContactId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesConversationId, setMessagesConversationId] = useState(null)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState('')
  const [socketState, setSocketState] = useState('connecting')
  const [socketError, setSocketError] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [olderPage, setOlderPage] = useState(0)
  const [hasOlder, setHasOlder] = useState(false)
  const messageListRef = useRef(null)
  const fileInputRef = useRef(null)
  const socketRef = useRef(null)
  const activeContactRef = useRef(null)
  const searchRef = useRef('')
  const searchTimer = useRef(null)

  const activeContact = useMemo(
    () => contacts.find((contact) => contact.userId === activeContactId) || null,
    [contacts, activeContactId],
  )
  const visibleMessages = useMemo(
    () => activeContact?.conversationId === messagesConversationId ? messages : [],
    [activeContact?.conversationId, messagesConversationId, messages],
  )

  useEffect(() => { activeContactRef.current = activeContact }, [activeContact])
  useEffect(() => { searchRef.current = search }, [search])

  const refreshContacts = useCallback(async (query = searchRef.current) => {
    try {
      const nextContacts = await getChatContacts(query)
      setContacts(nextContacts)
      setActiveContactId((current) => current && nextContacts.some((item) => item.userId === current)
        ? current
        : (nextContacts[0]?.userId ?? null))
      setError('')
    } catch (requestError) {
      setError(chatErrorMessage(requestError))
    } finally {
      setLoadingContacts(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getChatContacts(search, controller.signal)
      .then((nextContacts) => {
        setContacts(nextContacts)
        setActiveContactId((current) => current && nextContacts.some((item) => item.userId === current)
          ? current
          : (nextContacts[0]?.userId ?? null))
        setError('')
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(chatErrorMessage(requestError))
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingContacts(false) })
    return () => controller.abort()
  }, [search])

  useEffect(() => {
    socketRef.current = connectChatSocket({
      onStatus: (state, message = '') => {
        setSocketState(state)
        setSocketError(message)
      },
      onMessage: (message) => {
        const selected = activeContactRef.current
        if (selected && (message.senderId === selected.userId || message.receiverId === selected.userId)) {
          setMessages((current) => mergeMessage(current, message))
          setMessagesConversationId(message.conversationId)
          if (message.senderId === selected.userId && message.conversationId) {
            markChatRead(message.conversationId).catch(() => {})
          }
        }
        refreshContacts()
      },
    })
    return () => socketRef.current?.disconnect()
  }, [refreshContacts])

  useEffect(() => {
    const conversationId = activeContact?.conversationId
    if (!conversationId) return undefined

    const controller = new AbortController()
    // This is the loading state for the async request started by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingMessages(true)
    getChatMessages(conversationId, 0, controller.signal)
      .then(async (result) => {
        if (controller.signal.aborted) return
        setMessages(result.items || [])
        setMessagesConversationId(conversationId)
        setOlderPage(result.page || 0)
        setHasOlder(Boolean(result.hasNext))
        await markChatRead(conversationId)
        refreshContacts()
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(chatErrorMessage(requestError))
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingMessages(false) })
    return () => controller.abort()
  }, [activeContact, refreshContacts])

  useEffect(() => {
    const node = messageListRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [visibleMessages, loadingMessages, activeContactId])

  useEffect(() => () => window.clearTimeout(searchTimer.current), [])

  const handleSearch = (event) => {
    const value = event.target.value
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => setSearch(value.trim()), 250)
  }

  const handleSend = async (event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!activeContact || !content || sending) return
    try {
      setSending(true)
      socketRef.current.send(activeContact.userId, content)
      setDraft('')
      setError('')
    } catch (sendError) {
      setError(sendError.message || chatErrorMessage(sendError))
    } finally {
      setSending(false)
    }
  }

  const handleImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !activeContact) return
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn một tệp hình ảnh.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh không được vượt quá 5 MB.')
      return
    }
    try {
      setUploading(true)
      const mediaUrl = await uploadChatImage(file)
      socketRef.current.send(activeContact.userId, draft.trim() || null, 'IMAGE', mediaUrl)
      setDraft('')
      setError('')
    } catch (uploadError) {
      setError(chatErrorMessage(uploadError))
    } finally {
      setUploading(false)
    }
  }

  const loadOlderMessages = async () => {
    if (!activeContact?.conversationId || !hasOlder || loadingMessages) return
    const nextPage = olderPage + 1
    try {
      setLoadingMessages(true)
      const result = await getChatMessages(activeContact.conversationId, nextPage)
      setMessages((current) => [...(result.items || []), ...(messagesConversationId === activeContact.conversationId ? current : [])])
      setMessagesConversationId(activeContact.conversationId)
      setOlderPage(nextPage)
      setHasOlder(Boolean(result.hasNext))
    } catch (requestError) {
      setError(chatErrorMessage(requestError))
    } finally {
      setLoadingMessages(false)
    }
  }

  const chatContent = (
    <>
      {error && <div className="chat-alert" role="alert"><span className="material-symbols-outlined">error</span>{error}</div>}
      <section className="member-chat-panel" aria-label="Hộp thư với huấn luyện viên">
        <aside className="member-chat-contacts">
          <div className="member-chat-list-heading">
            <div>
              <span className="section-heading-kicker">KẾT NỐI CỦA BẠN</span>
              <h2>Huấn luyện viên</h2>
            </div>
            <span className="chat-contact-count">{contacts.length}</span>
          </div>
          <label className="chat-search-box">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input onChange={handleSearch} placeholder="Tìm huấn luyện viên" type="search" />
          </label>
          <div className="member-chat-contact-list">
            {loadingContacts ? (
              <div className="chat-empty-state"><span className="chat-spinner" />Đang tải danh sách...</div>
            ) : contacts.length === 0 ? (
              <div className="chat-empty-state">
                <span className="material-symbols-outlined">forum</span>
                <strong>Chưa có huấn luyện viên</strong>
                <span>Danh sách sẽ hiển thị khi bạn có lớp đã đăng ký với huấn luyện viên.</span>
              </div>
            ) : contacts.map((contact) => (
              <button
                aria-current={activeContactId === contact.userId ? 'true' : undefined}
                className={`chat-contact${activeContactId === contact.userId ? ' chat-contact-active' : ''}`}
                key={contact.userId}
                onClick={() => setActiveContactId(contact.userId)}
                type="button"
              >
                <ContactAvatar contact={contact} />
                <span className="chat-contact-copy">
                  <span className="chat-contact-name">{contact.fullName || 'Huấn luyện viên'}</span>
                  <span className="chat-contact-class">{contact.className || contact.subjectName || 'Lớp đang theo học'}</span>
                  <span className="chat-contact-preview">{contact.lastMessage || 'Bắt đầu trò chuyện'}</span>
                </span>
                <span className="chat-contact-meta">
                  {contact.lastMessageAt && <time>{timeFormatter.format(new Date(contact.lastMessageAt))}</time>}
                  {contact.unreadCount > 0 && <span className="chat-unread-badge">{contact.unreadCount}</span>}
                </span>
              </button>
            ))}
          </div>
          <div className={`chat-connection-status chat-connection-${socketState}`}>
            <span />
            {socketState === 'connected' ? 'Đang kết nối' : socketState === 'error' ? 'Mất kết nối' : 'Đang kết nối lại...'}
          </div>
        </aside>

        <div className="member-chat-conversation">
          {activeContact ? (
            <>
              <header className="chat-conversation-header">
                <ContactAvatar contact={activeContact} />
                <div>
                  <h2>{activeContact.fullName || 'Huấn luyện viên'}</h2>
                  <p>{activeContact.subjectName || 'Huấn luyện viên'}{activeContact.className ? ` · ${activeContact.className}` : ''}</p>
                </div>
                <span className="material-symbols-outlined chat-header-icon" title="Trao đổi riêng tư">lock</span>
              </header>

              {socketError && socketState === 'error' && <div className="chat-inline-warning">{socketError}</div>}
              <div className="chat-message-list" ref={messageListRef}>
                {hasOlder && (
                  <button className="chat-load-older" onClick={loadOlderMessages} type="button">Tải tin nhắn cũ hơn</button>
                )}
                {loadingMessages && visibleMessages.length === 0 && <div className="chat-empty-state">Đang tải tin nhắn...</div>}
                {!loadingMessages && visibleMessages.length === 0 && (
                  <div className="chat-first-message">
                    <span className="material-symbols-outlined">waving_hand</span>
                    <strong>Bắt đầu cuộc trò chuyện</strong>
                    <span>Gửi lời nhắn cho huấn luyện viên của bạn nhé.</span>
                  </div>
                )}
                {visibleMessages.map((message, index) => {
                  const own = message.senderId !== activeContact.userId
                  const previous = messages[index - 1]
                  const showDate = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt)
                  return (
                    <div className="chat-message-group" key={message.messageId || `${message.createdAt}-${index}`}>
                      {showDate && <div className="chat-day-divider"><span>{formatDay(message.createdAt)}</span></div>}
                      <article className={`chat-message${own ? ' chat-message-own' : ''}`}>
                        {!own && <ContactAvatar contact={activeContact} small />}
                        <div className="chat-message-content">
                          {message.content && <p>{message.content}</p>}
                          {message.mediaUrl && (
                            <a className="chat-image-link" href={resolveChatMediaUrl(message.mediaUrl)} target="_blank" rel="noreferrer">
                              <img alt="Ảnh trao đổi với huấn luyện viên" loading="lazy" src={resolveChatMediaUrl(message.mediaUrl)} />
                            </a>
                          )}
                          <time>{timeFormatter.format(new Date(message.createdAt))}</time>
                        </div>
                      </article>
                    </div>
                  )
                })}
              </div>

              <form className="chat-composer" onSubmit={handleSend}>
                <input
                  accept="image/*"
                  aria-label="Chọn ảnh để gửi"
                  className="chat-file-input"
                  onChange={handleImage}
                  ref={fileInputRef}
                  type="file"
                />
                <button
                  aria-label="Đính kèm ảnh"
                  className="chat-attach-button"
                  disabled={uploading || socketState !== 'connected'}
                  onClick={() => fileInputRef.current?.click()}
                  title="Gửi ảnh (tối đa 5 MB)"
                  type="button"
                ><span className="material-symbols-outlined">add_photo_alternate</span></button>
                <input
                  aria-label="Nhập tin nhắn"
                  maxLength={4000}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Nhập tin nhắn cho huấn luyện viên..."
                  value={draft}
                />
                <button className="chat-send-button" disabled={!draft.trim() || sending || socketState !== 'connected'} type="submit">
                  <span>{sending ? 'Đang gửi' : 'Gửi'}</span>
                  <span className="material-symbols-outlined">send</span>
                </button>
                {uploading && <span className="chat-upload-status" role="status">Đang tải ảnh...</span>}
              </form>
            </>
          ) : (
            <div className="chat-no-selection">
              <span className="material-symbols-outlined">forum</span>
              <h2>Trò chuyện cùng huấn luyện viên</h2>
              <p>{loadingContacts ? 'Đang tải danh sách huấn luyện viên...' : 'Khi bạn có đăng ký lớp phù hợp, huấn luyện viên phụ trách sẽ xuất hiện tại đây.'}</p>
            </div>
          )}
        </div>
      </section>
    </>
  )

  if (embedded) {
    return (
      <section aria-label="Chat với huấn luyện viên" className="member-chat-widget">
        <header className="member-chat-widget-title">
          <span><span className="material-symbols-outlined">forum</span> Trao đổi với huấn luyện viên</span>
          <button aria-label="Đóng hộp chat" onClick={onClose} type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        {chatContent}
      </section>
    )
  }

  return (
    <DashboardLayout
      eyebrow="Hội viên / Trao đổi với huấn luyện viên"
      menuItems={memberMenuItems}
      role="Hội viên"
      showChatLauncher={false}
      title="Trao đổi với huấn luyện viên"
      subtitle="Hỏi đáp về lịch tập, kỹ thuật và quá trình luyện tập của bạn."
    >
      {chatContent}
    </DashboardLayout>
  )
}
