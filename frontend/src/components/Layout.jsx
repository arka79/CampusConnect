import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, FileText, MessageSquare, Users,
  ShieldCheck, User, LogOut, Menu, X, BookOpen, Bell
} from 'lucide-react'

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
          <button className="btn btn-ghost btn-icon" style={{ display: 'none' }}
            onClick={() => setSidebarOpen(true)}
            id="menu-btn">
            <Menu size={20} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
