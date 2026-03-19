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
      <div className="page-hero">
        <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">{user?.department} · {user?.year} · Campus Connect</p>
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
          <div className="recent-list">
            {loading ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {[1,2,3].map(i => (
                  <div key={i} className="file-card" style={{ height: 84, alignItems: 'center' }}>
                    <div className="file-thumb skeleton" style={{ width: 64, height: 64, borderRadius: 10 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 6 }} />
                      <div className="skeleton" style={{ height: 12, width: '40%', marginTop: 8, borderRadius: 6 }} />
                    </div>
                    <div style={{ width: 70 }}>
                      <div className="skeleton" style={{ height: 12, width: 40, borderRadius: 6, marginLeft: 'auto' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentFiles.length === 0 ? (
              <div className="empty-state card">
                <FileText size={48} className="empty-icon" />
                <div className="empty-title">No files yet</div>
                <div className="empty-text">Upload your study materials and they'll appear here for quick access.</div>
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={() => navigate('/files')}>Upload Material</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {recentFiles.map(f => (
                  <div key={f.id} className="file-card">
                    <div className="file-thumb" style={{
                      background: f.file_type === 'paper' ? 'linear-gradient(135deg, rgba(192,57,43,0.12), rgba(192,57,43,0.04))' : 'linear-gradient(135deg, rgba(26,95,168,0.12), rgba(26,95,168,0.04))'
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: f.file_type === 'paper' ? 'var(--red)' : 'var(--blue)' }}>{f.file_type === 'paper' ? 'EX' : 'NT'}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)' }} className="truncate">{f.title}</div>
                      <div className="file-meta" style={{ marginTop: 6 }}>
                        <span style={{ color: 'var(--gray-500)' }}>{f.department}</span>
                        <span style={{ margin: '0 6px', color: 'var(--gray-300)' }}>·</span>
                        <span style={{ color: 'var(--gray-500)' }}>{f.year}</span>
                        <span style={{ margin: '0 6px', color: 'var(--gray-300)' }}>·</span>
                        <span style={{ color: 'var(--gray-500)' }}>by {f.uploader_name}</span>
                      </div>
                      {f.tags && f.tags.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {f.tags.slice(0,3).map(t => <span key={t} className="badge badge-gray">{t}</span>)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 90 }}>
                      <div style={{ color: 'var(--gray-400)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Download size={12} /> <span>{f.download_count}</span>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/files')}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <button key={q.path} onClick={() => navigate(q.path)} className="quick-link-btn" style={{ color: q.color }}>
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
