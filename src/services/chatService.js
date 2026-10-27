import axiosClient, { API_BASE_URL } from '../api/axiosClient'
import { getAccessToken } from '../auth/authStorage'

function authHeaders() {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getChatContacts(search = '', signal) {
  const response = await axiosClient.get('/api/chat/contacts', {
    params: search ? { search } : {},
    signal,
    headers: authHeaders(),
  })
  return response.data?.items || []
}

export async function getChatMessages(conversationId, page = 0, signal) {
  const response = await axiosClient.get(`/api/chat/conversations/${conversationId}/messages`, {
    params: { page, size: 30 },
    signal,
    headers: authHeaders(),
  })
  return response.data
}

export async function markChatRead(conversationId) {
  const response = await axiosClient.put(
    `/api/chat/conversations/${conversationId}/read`,
    {},
    { headers: authHeaders() },
  )
  return response.data
}

export async function uploadChatImage(file) {
  const form = new FormData()
  form.append('file', file)
  const response = await axiosClient.post('/api/chat/upload-image', form, {
    timeout: 30000,
    headers: { ...authHeaders(), 'Content-Type': undefined },
  })
  if (response.data?.success === false || !response.data?.url) {
    throw new Error(response.data?.message || 'Không thể tải ảnh lên.')
  }
  return response.data.url
}

export function resolveChatMediaUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

function encodeSockJsFrame(stompFrame) {
  return JSON.stringify([stompFrame])
}

function parseStompFrame(frame) {
  const separator = frame.indexOf('\n\n')
  if (separator < 0) return null
  const [command, ...headerLines] = frame.slice(0, separator).split('\n')
  const headers = Object.fromEntries(headerLines.map((line) => {
    const colon = line.indexOf(':')
    return colon < 0 ? [line, ''] : [line.slice(0, colon), line.slice(colon + 1)]
  }))
  let body = frame.slice(separator + 2)
  if (body.endsWith('\u0000')) body = body.slice(0, -1)
  if (headers['content-length']) body = body.slice(0, Number(headers['content-length']))
  return { command, headers, body }
}

// Spring exposes SockJS rather than a bare STOMP WebSocket. This small adapter
// uses SockJS's native WebSocket transport and the STOMP frames used by BE.
export function connectChatSocket({ onMessage, onStatus }) {
  const token = getAccessToken()
  if (!token) {
    onStatus?.('error', 'Phiên đăng nhập đã hết hạn.')
    return () => {}
  }

  let stopped = false
  let socket
  let reconnectTimer
  let attempt = 0
  let connected = false
  let receiveBuffer = ''

  const connect = () => {
    if (stopped) return
    const session = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    const base = API_BASE_URL.replace(/^http/i, 'ws').replace(/\/$/, '')
    socket = new WebSocket(`${base}/ws/000/${session}/websocket`)
    onStatus?.('connecting')

    socket.onopen = () => { attempt = 0 }
    socket.onmessage = (event) => {
      const payload = String(event.data)
      if (payload === 'o') {
        const connectFrame = `CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:10000,10000\nAuthorization:Bearer ${token}\n\n\u0000`
        socket.send(encodeSockJsFrame(connectFrame))
        return
      }
      if (payload.startsWith('c')) {
        onStatus?.('error', 'Máy chủ đã đóng kết nối chat.')
        return
      }
      if (payload === 'h') return

      let frames
      try {
        frames = payload.startsWith('a') ? JSON.parse(payload.slice(1)) : [payload]
      } catch {
        return
      }
      for (const frame of frames) {
        receiveBuffer += frame
        let end = receiveBuffer.indexOf('\u0000')
        while (end >= 0) {
          const parsed = parseStompFrame(receiveBuffer.slice(0, end))
          receiveBuffer = receiveBuffer.slice(end + 1)
          if (parsed?.command === 'CONNECTED') {
            connected = true
            onStatus?.('connected')
            socket.send(encodeSockJsFrame('SUBSCRIBE\nid:chat-messages\ndestination:/user/queue/messages\nack:auto\n\n\u0000'))
          } else if (parsed?.command === 'MESSAGE') {
            try { onMessage?.(JSON.parse(parsed.body)) } catch { /* Ignore malformed server payloads. */ }
          } else if (parsed?.command === 'ERROR') {
            onStatus?.('error', parsed.body || 'Không thể xác thực kết nối chat.')
          }
          end = receiveBuffer.indexOf('\u0000')
        }
      }
    }
    socket.onerror = () => {
      if (!stopped) onStatus?.('error', 'Không thể kết nối chat realtime.')
    }
    socket.onclose = () => {
      connected = false
      if (stopped) return
      onStatus?.('connecting')
      const delay = Math.min(1000 * (2 ** attempt), 15000)
      attempt += 1
      reconnectTimer = window.setTimeout(connect, delay)
    }
  }

  connect()

  return {
    send(receiverId, content, messageType = 'TEXT', mediaUrl = null) {
      if (!connected || socket?.readyState !== WebSocket.OPEN) {
        throw new Error('Đang kết nối lại chat. Vui lòng thử gửi lại sau ít giây.')
      }
      const body = JSON.stringify({ receiverId, content, messageType, mediaUrl })
      const frame = `SEND\ndestination:/app/chat.send\ncontent-type:application/json\n\n${body}\u0000`
      socket.send(encodeSockJsFrame(frame))
    },
    disconnect() {
      stopped = true
      window.clearTimeout(reconnectTimer)
      if (socket?.readyState === WebSocket.OPEN && connected) {
        socket.send(encodeSockJsFrame('DISCONNECT\n\n\u0000'))
      }
      socket?.close()
    },
  }
}

export function chatErrorMessage(error) {
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error.response?.status === 403) return 'Bạn chỉ có thể chat với huấn luyện viên đang phụ trách lớp của mình.'
  if (error.response?.status === 404) return 'Không tìm thấy cuộc trò chuyện hoặc API chat.'
  if (error.response?.status >= 500) return 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.'
  if (error.request) return 'Không thể kết nối máy chủ. Hãy kiểm tra Backend đang chạy.'
  return error.response?.data?.message || error.message || 'Không thể thực hiện thao tác chat.'
}
