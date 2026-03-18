import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { FileText, Users, MessageSquare, Download, ArrowRight, TrendingUp, AlertCircle, Info, AlertTriangle } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value ?? '—'}</div>
      </div>
    </div>
  )
}

const priorityIcon = { high: AlertCircle, medium: Info, low: AlertTriangle }
const priorityColor = { high: 'var(--red)', medium: 'var(--blue)', low: 'var(--gold)' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [recentFiles, setRecentFiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      user?.role === 'admin' ? api.get('/admin/stats') : Promise.resolve(null),
      api.get('/announcements'),
      api.get('/files?limit=5'),
    ]).then(([statsRes, annRes, filesRes]) => {
      if (statsRes) setStats(statsRes.data)
      setAnnouncements(annRes.data.announcements || [])
      setRecentFiles(filesRes.data.files || [])
    }).finally(() => setLoading(false))
  }, [user])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">{user?.department} · {user?.year} · Adamas University</p>
      </div>

      {/* Admin Stats */}
      {user?.role === 'admin' && stats && (
        <div className="grid-4" style={{ marginBottom: 28 }}>
          <StatCard icon={Users} label="Total Users" value={stats.users} color="var(--blue)" bg="rgba(26,95,168,0.1)" />
          <StatCard icon={FileText} label="Approved Files" value={stats.files} color="var(--green)" bg="rgba(26,122,74,0.1)" />
          <StatCard icon={MessageSquare} label="Messages" value={stats.messages} color="var(--gold)" bg="rgba(201,168,76,0.12)" />
          <StatCard icon={Download} label="Downloads" value={stats.downloads} color="#8B4A9C" bg="rgba(139,74,156,0.1)" />
        </div>
      )}

      {user?.role === 'admin' && stats?.pending > 0 && (
        <div style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => navigate('/admin')}>
          <AlertCircle size={16} color="var(--red)" />
          <span style={{ fontSize: 14, color: 'var(--red)', fontWeight: 500 }}>
            {stats.pending} file{stats.pending > 1 ? 's' : ''} pending approval
          </span>
          <ArrowRight size={14} color="var(--red)" style={{ marginLeft: 'auto' }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Recent Files */}
        <div>
          <div className="flex-between" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>Recent Files</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/files')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? [1,2,3].map(i => (
              <div key={i} style={{ height: 76, background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-100)', animation: 'pulse 1.5s infinite' }} />
            )) : recentFiles.length === 0 ? (
              <div className="empty-state">
                <FileText size={40} className="empty-icon" />
                <div className="empty-title">No files yet</div>
                <div className="empty-text">Be the first to upload study materials!</div>
              </div>
            ) : recentFiles.map(f => (
              <div key={f.id} className="file-card">
                <div className="file-type-icon" style={{
                  background: f.file_type === 'paper' ? 'rgba(192,57,43,0.1)' : 'rgba(26,95,168,0.1)',
                  color: f.file_type === 'paper' ? 'var(--red)' : 'var(--blue)'
                }}>
                  {f.file_type === 'paper' ? 'EX' : 'NT'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-900)' }} className="truncate">{f.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                    {f.department} · {f.year} · by {f.uploader_name}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gray-400)', flexShrink: 0 }}>
                  <Download size={12} /> {f.download_count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div>
          <div className="flex-between" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>Announcements</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {announcements.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 14 }}>
                No announcements
              </div>
            ) : announcements.map(a => {
              const Icon = priorityIcon[a.priority] || Info
              return (
                <div key={a.id} className={`announcement-card ${a.priority}`}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <Icon size={14} color={priorityColor[a.priority] || 'var(--gold)'} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{a.title}</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5 }}>{a.content}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 8 }}>
                    {a.creator_name} · {new Date(a.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick links */}
          <div style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Quick Access</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Upload Study Material', path: '/files', color: 'var(--navy)' },
                { label: 'Join a Study Group', path: '/groups', color: 'var(--gold)' },
                { label: 'Open Campus Chat', path: '/chat', color: 'var(--green)' },
              ].map(q => (
                <button key={q.path} onClick={() => navigate(q.path)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', background: '#fff', border: '1px solid var(--gray-100)',
                    borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                    color: q.color, transition: 'all 0.15s'
                  }}
                  onMouseOver={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                  onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                  {q.label} <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
