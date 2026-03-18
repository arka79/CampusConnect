import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, FileText, MessageSquare, Users,
  ShieldCheck, User, LogOut, Menu, X, BookOpen, Bell
} from 'lucide-react'
import { getSocket } from '../utils/socket'
import api from '../utils/api'
import { formatDistanceToNow } from 'date-fns'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Files & Notes', icon: FileText, path: '/files' },
  { label: 'Campus Chat', icon: MessageSquare, path: '/chat' },
  { label: 'Study Groups', icon: Users, path: '/groups' },
]
const bottomItems = [
  { label: 'Profile', icon: User, path: '/profile' },
]

function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AU'
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const notRef = useRef()

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const NavItem = ({ item }) => (
    <button
      className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
      onClick={() => { navigate(item.path); setSidebarOpen(false) }}
    >
      <item.icon className="nav-icon" size={18} />
      <span>{item.label}</span>
    </button>
  )

  // Notifications: subscribe to socket events and load initial announcements
  useEffect(() => {
    let mounted = true
    const socket = getSocket()

    // load recent announcements from API
    api.get('/announcements').then(res => {
      if (!mounted) return
      const ann = (res.data.announcements || []).slice(0, 8).map(a => ({
        id: `ann-${a.id}`,
        type: 'announcement',
        title: a.title,
        body: a.content,
        url: '/admin',
        ts: new Date(a.created_at).toISOString(),
        read: false,
      }))
      setNotifications(prev => {
        const merged = [...ann, ...prev].slice(0, 50)
        setUnread(merged.filter(n => !n.read).length)
        return merged
      })
    }).catch(() => {})

    if (!socket) return () => { mounted = false }

    const onGlobal = (msg) => {
      const n = {
        id: `gmsg-${msg.id}-${Date.now()}`,
        type: 'message',
        title: `New message from ${msg.sender_name}`,
        body: msg.content.slice(0, 120),
        url: '/chat',
        ts: new Date(msg.created_at).toISOString(),
        read: false,
      }
      setNotifications(prev => { const p = [n, ...prev].slice(0,50); setUnread(p.filter(x=>!x.read).length); return p })
    }

    const onGroup = (msg) => {
      const n = {
        id: `g-${msg.id}-${Date.now()}`,
        type: 'group_message',
        title: `New message in ${msg.group_name}`,
        body: msg.content.slice(0,120),
        url: `/chat`,
        ts: new Date(msg.created_at).toISOString(),
        read: false,
      }
      setNotifications(prev => { const p = [n, ...prev].slice(0,50); setUnread(p.filter(x=>!x.read).length); return p })
    }

    socket.on('new_global_message', onGlobal)
    socket.on('new_group_message', onGroup)

    return () => {
      mounted = false
      socket.off && socket.off('new_global_message', onGlobal)
      socket.off && socket.off('new_group_message', onGroup)
    }
  }, [])

  // click outside to close notifications
  useEffect(() => {
    const onDoc = (e) => {
      if (notifOpen && notRef.current && !notRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [notifOpen])

  const openNotifications = () => {
    setNotifOpen(v => !v)
    if (unread > 0) {
      // mark visible notifications as read when opening
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnread(0)
    }
  }

  const goToNotification = (n) => {
    if (n.url) navigate(n.url)
    setNotifOpen(false)
  }

  return (
    <div className="app-layout">
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, background: 'var(--gold)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <BookOpen size={18} color="#0B1F3A" />
            </div>
            <div>
              <div className="sidebar-logo-text">Adamas</div>
              <div className="sidebar-logo-sub">University</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {navItems.map(item => <NavItem key={item.path} item={item} />)}

          {user?.role === 'admin' && (
            <>
              <div className="nav-section-label" style={{ marginTop: 8 }}>Administration</div>
              <NavItem item={{ label: 'Admin Panel', icon: ShieldCheck, path: '/admin' }} />
            </>
          )}

          <div className="nav-section-label" style={{ marginTop: 8 }}>Account</div>
          {bottomItems.map(item => <NavItem key={item.path} item={item} />)}
          <button className="nav-item" onClick={logout}>
            <LogOut className="nav-icon" size={18} />
            <span>Sign Out</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip" onClick={() => navigate('/profile')}>
            <div className="avatar">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : getInitials(user?.name)}
            </div>
            <div>
              <div className="user-chip-name">{user?.name}</div>
              <div className="user-chip-role">{user?.role} · {user?.department || 'N/A'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="page-header">
          <button className={`menu-toggle btn btn-ghost btn-icon`} onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle menu">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div style={{ marginLeft: 12 }}>
            <div className="header-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa4b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input aria-label="Search" placeholder="Search files, groups, people..." />
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }} ref={notRef}>
            <button className="notification-bell" title="Notifications" onClick={openNotifications} aria-expanded={notifOpen}>
              <Bell size={16} />
              {unread > 0 && <span className="notif-dot" />}
            </button>

            {notifOpen && (
              <div style={{ position: 'absolute', right: 0, top: '48px', width: 340, maxHeight: 420, overflow: 'auto', background: 'var(--white)', border: '1px solid var(--gray-100)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', zIndex: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ fontWeight: 700 }}>Notifications</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{notifications.filter(n=>!n.read).length} unread</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notifications.length === 0 && (
                    <div style={{ padding: 18, textAlign: 'center', color: 'var(--gray-500)' }}>No notifications</div>
                  )}
                  {notifications.map(n => (
                    <button key={n.id} onClick={() => goToNotification(n)} style={{ textAlign: 'left', padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start', border: 'none', background: n.read ? 'transparent' : 'rgba(26,95,168,0.04)', cursor: 'pointer' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: n.type === 'announcement' ? 'rgba(201,168,76,0.12)' : 'rgba(26,95,168,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {n.type === 'announcement' ? <Bell size={16} color={n.type === 'announcement' ? 'var(--gold)' : 'var(--navy)'} /> : <MessageSquare size={16} color={'var(--navy)'} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{n.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 6 }} className="truncate">{n.body}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 8 }}>{formatDistanceToNow(new Date(n.ts), { addSuffix: true })}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <span className="badge badge-gold" style={{ textTransform: 'capitalize' }}>
              {user?.role}
            </span>
            {user?.year && <span className="text-sm text-muted">{user.year}</span>}
          </div>
        </header>
        <div className="page-body">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
