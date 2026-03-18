import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSocket } from '../utils/socket'
import api from '../utils/api'
import { Send, Hash, Users, Wifi, WifiOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AU'
}

function Message({ msg, isOwn }) {
  return (
    <div className={`message-bubble ${isOwn ? 'own' : ''}`}>
      {!isOwn && (
        <div className="avatar sm" style={{ flexShrink: 0, marginTop: 2 }}>
          {msg.sender_avatar
            ? <img src={msg.sender_avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : getInitials(msg.sender_name)}
        </div>
      )}
      <div>
        {!isOwn && (
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 3 }}>
            {msg.sender_name}
            {msg.sender_role !== 'student' && (
              <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--gold-pale)', color: '#7a5f1a', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                {msg.sender_role}
              </span>
            )}
          </div>
        )}
        <div className="bubble-content">{msg.content}</div>
        <div className="bubble-meta">
          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { user } = useAuth()
  const socket = getSocket()
  const location = useLocation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typing, setTyping] = useState(null)
  // init activeRoom from navigation state or ?group=ID
  const [activeRoom, setActiveRoom] = useState(() => location.state?.groupId || 'global')
  const [groups, setGroups] = useState([])
  const bottomRef = useRef()
  const typingTimer = useRef()

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

  // Load history
  useEffect(() => {
    const load = async () => {
      try {
        const url = activeRoom === 'global' ? '/messages/global' : `/messages/group/${activeRoom}`
        const res = await api.get(url)
        setMessages(res.data.messages || [])
        scrollBottom()
      } catch {}
    }
    load()
  }, [activeRoom])

  // Load groups
  useEffect(() => {
    api.get('/groups').then(res => setGroups(res.data.groups || []))
  }, [])

  // Socket setup
  useEffect(() => {
    if (!socket) return
    setConnected(socket.connected)
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('online_users', (users) => setOnlineUsers(users))

    socket.on('new_global_message', (msg) => {
      if (activeRoom === 'global') {
        setMessages(prev => [...prev, msg])
        scrollBottom()
      }
    })
    socket.on('new_group_message', (msg) => {
      if (activeRoom === msg.group_id) {
        setMessages(prev => [...prev, msg])
        scrollBottom()
      }
    })
    socket.on('user_typing', ({ name, room }) => {
      const target = room === 'global' ? 'global' : room
      if (target === activeRoom) {
        setTyping(name)
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setTyping(null), 2500)
      }
    })

    // Join all group rooms
    const groupIds = groups.map(g => g.id)
    if (groupIds.length) socket.emit('join_groups', groupIds)

    return () => {
      socket.off('connect'); socket.off('disconnect'); socket.off('online_users')
      socket.off('new_global_message'); socket.off('new_group_message'); socket.off('user_typing')
    }
  }, [socket, activeRoom, groups])

  const sendMessage = useCallback(() => {
    if (!input.trim() || !socket) return
    if (activeRoom === 'global') {
      socket.emit('send_global_message', { content: input.trim() })
    } else {
      socket.emit('send_group_message', { content: input.trim(), group_id: activeRoom })
    }
    setInput('')
  }, [input, socket, activeRoom])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    else {
      if (activeRoom === 'global') socket?.emit('typing_global')
      else socket?.emit('typing_group', { group_id: activeRoom })
    }
  }

  const myGroups = groups.filter(g => g.is_member)
  const activeGroup = groups.find(g => g.id === activeRoom)

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Campus Chat</h1>
          <p className="page-subtitle">Real-time messaging with students and faculty</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          {connected ? <Wifi size={14} color="var(--green)" /> : <WifiOff size={14} color="var(--red)" />}
          <span style={{ color: connected ? 'var(--green)' : 'var(--red)' }}>
            {connected ? `${onlineUsers.length} online` : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="chat-layout" style={{ height: 'calc(100vh - 180px)', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 8 }}>Channels</div>
            <button
              onClick={() => setActiveRoom('global')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: 14,
                background: activeRoom === 'global' ? 'var(--navy)' : 'transparent',
                color: activeRoom === 'global' ? '#fff' : 'var(--gray-700)',
                transition: 'all 0.15s', fontWeight: 500
              }}>
              <Hash size={15} /> Campus Global
            </button>
          </div>

          {myGroups.length > 0 && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 8 }}>My Groups</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {myGroups.map(g => (
                  <button key={g.id} onClick={() => setActiveRoom(g.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: 14,
                      background: activeRoom === g.id ? 'var(--navy)' : 'transparent',
                      color: activeRoom === g.id ? '#fff' : 'var(--gray-700)',
                      transition: 'all 0.15s', fontWeight: 400
                    }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: g.avatar_color, flexShrink: 0 }} />
                    <span className="truncate" style={{ textAlign: 'left' }}>{g.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Online users */}
          <div style={{ padding: '14px 16px', flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 8 }}>
              Online ({onlineUsers.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
              {onlineUsers.slice(0, 15).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <div className="avatar sm">{getInitials(u.name)}</div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, background: 'var(--green)', borderRadius: '50%', border: '1.5px solid #fff' }} />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--gray-700)' }} className="truncate">{u.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat main */}
        <div className="chat-main">
          {/* Header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 10, background: '#fff' }}>
            {activeRoom === 'global'
              ? <><Hash size={18} color="var(--navy)" /><span style={{ fontWeight: 600, fontSize: 15 }}>Campus Global</span><span style={{ fontSize: 13, color: 'var(--gray-400)' }}>· All students & faculty</span></>
              : <><div style={{ width: 22, height: 22, borderRadius: 4, background: activeGroup?.avatar_color }} /><span style={{ fontWeight: 600, fontSize: 15 }}>{activeGroup?.name}</span><span style={{ fontSize: 13, color: 'var(--gray-400)' }}>· {activeGroup?.member_count} members</span></>
            }
          </div>

          {/* Messages */}
          <div className="chat-messages" style={{ background: 'var(--gray-50)' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)', fontSize: 14 }}>
                No messages yet. Start the conversation!
              </div>
            )}
            {messages.map(msg => (
              <Message key={msg.id} msg={msg} isOwn={msg.sender_id === user?.id} />
            ))}
            {typing && (
              <div style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic', padding: '0 4px' }}>
                {typing} is typing...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="chat-input-bar">
            <textarea
              className="chat-input"
              placeholder={`Message ${activeRoom === 'global' ? '#campus-global' : activeGroup?.name || ''}...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              style={{ height: 42 }}
            />
            <button className="btn btn-primary btn-icon" onClick={sendMessage} disabled={!input.trim()}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
