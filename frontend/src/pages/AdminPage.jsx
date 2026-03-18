import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Users, FileText, CheckCircle, XCircle, Trash2, UserPlus, Download, Bell, BarChart2, X, Shield, Eye } from 'lucide-react'

const TABS = [
  { id: 'stats', label: 'Overview', icon: BarChart2 },
  { id: 'files', label: 'File Approvals', icon: FileText },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'announce', label: 'Announcements', icon: Bell },
]

function StatBox({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || 'var(--navy)', fontFamily: 'DM Sans' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [pendingFiles, setPendingFiles] = useState([])
  const [users, setUsers] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [annForm, setAnnForm] = useState({ title: '', content: '', priority: 'low' })
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'student', department: '', year: '' })

  useEffect(() => { loadStats() }, [])
  useEffect(() => { if (tab === 'files') loadPending() }, [tab])
  useEffect(() => { if (tab === 'users') loadUsers() }, [tab, userSearch, roleFilter])
  useEffect(() => { if (tab === 'announce') loadAnnouncements() }, [tab])

  const loadStats = async () => {
    try { const r = await api.get('/admin/stats'); setStats(r.data) } catch {}
  }
  const loadPending = async () => {
    setLoading(true)
    try { const r = await api.get('/files/pending'); setPendingFiles(r.data.files || []) } catch {}
    finally { setLoading(false) }
  }
  const loadUsers = async () => {
    setLoading(true)
    try {
      const params = {}
      if (userSearch) params.search = userSearch
      if (roleFilter) params.role = roleFilter
      const r = await api.get('/admin/users', { params })
      setUsers(r.data.users || [])
    } catch {}
    finally { setLoading(false) }
  }
  const loadAnnouncements = async () => {
    try { const r = await api.get('/admin/announcements'); setAnnouncements(r.data.announcements || []) } catch {}
  }

  const approveFile = async (id) => {
    try { await api.put(`/files/${id}/approve`); toast.success('File approved'); loadPending(); loadStats() } catch { toast.error('Failed') }
  }
  const rejectFile = async (id) => {
    if (!confirm('Reject and delete this file?')) return
    try { await api.delete(`/files/${id}`); toast.success('File rejected'); loadPending(); loadStats() } catch { toast.error('Failed') }
  }
  const toggleUser = async (id, current) => {
    try { await api.put(`/admin/users/${id}`, { is_active: current ? 0 : 1 }); toast.success('User updated'); loadUsers() } catch { toast.error('Failed') }
  }
  const changeRole = async (id, role) => {
    try { await api.put(`/admin/users/${id}`, { role }); toast.success('Role updated'); loadUsers() } catch { toast.error('Failed') }
  }
  const deleteUser = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try { await api.delete(`/admin/users/${id}`); toast.success('User deleted'); loadUsers() } catch { toast.error('Failed') }
  }
  const postAnnouncement = async (e) => {
    e.preventDefault()
    try { await api.post('/admin/announcements', annForm); toast.success('Announcement posted!'); setAnnForm({ title: '', content: '', priority: 'low' }); loadAnnouncements() } catch { toast.error('Failed') }
  }
  const deleteAnn = async (id) => {
    try { await api.delete(`/admin/announcements/${id}`); toast.success('Deleted'); loadAnnouncements() } catch {}
  }
  const createUser = async (e) => {
    e.preventDefault()
    try { await api.post('/admin/users', newUser); toast.success('User created!'); setShowCreateUser(false); setNewUser({ name: '', email: '', password: '', role: 'student', department: '', year: '' }); loadUsers() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: 'var(--navy)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={20} color="var(--gold)" />
        </div>
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage users, files, and announcements</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', padding: 4, borderRadius: 'var(--radius)', border: '1px solid var(--gray-100)', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px',
              borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: tab === t.id ? 'var(--navy)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--gray-500)',
              transition: 'all 0.15s'
            }}>
            <t.icon size={15} /> {t.label}
            {t.id === 'files' && pendingFiles.length > 0 && (
              <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{pendingFiles.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'stats' && stats && (
        <div>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <StatBox label="Total Users" value={stats.users} color="var(--navy)" />
            <StatBox label="Approved Files" value={stats.files} color="var(--blue)" />
            <StatBox label="Pending Files" value={stats.pending} color="var(--red)" />
            <StatBox label="Study Groups" value={stats.groups} color="var(--gold)" />
            <StatBox label="Total Messages" value={stats.messages} color="#8B4A9C" />
            <StatBox label="Total Downloads" value={stats.downloads} color="var(--green)" />
          </div>
        </div>
      )}

      {/* File Approvals */}
      {tab === 'files' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Pending File Approvals ({pendingFiles.length})</h2>
          {pendingFiles.length === 0 ? (
            <div className="empty-state"><CheckCircle size={48} className="empty-icon" /><div className="empty-title">All clear!</div><div className="empty-text">No files pending approval.</div></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Title</th><th>Uploaded By</th><th>Dept · Year</th><th>Type</th><th>Size</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {pendingFiles.map(f => (
                    <tr key={f.id}>
                      <td><div style={{ fontWeight: 500, fontSize: 14 }}>{f.title}</div>{f.subject && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{f.subject}</div>}</td>
                      <td><div style={{ fontSize: 13 }}>{f.uploader_name}</div><div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{f.uploader_email}</div></td>
                      <td><span style={{ fontSize: 13 }}>{[f.department, f.year].filter(Boolean).join(' · ') || '—'}</span></td>
                      <td><span className={`badge badge-${f.file_type === 'paper' ? 'red' : 'blue'}`}>{f.file_type}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{f.file_size}</td>
                      <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{new Date(f.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <a href={f.file_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-xs btn-icon" title="Preview"><Eye size={13} /></a>
                          <button className="btn btn-gold btn-xs" onClick={() => approveFile(f.id)}><CheckCircle size={13} /> Approve</button>
                          <button className="btn btn-danger btn-xs" onClick={() => rejectFile(f.id)}><XCircle size={13} /> Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>User Management</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateUser(true)}><UserPlus size={15} /> Add User</button>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input className="form-input" placeholder="Search by name or email..." style={{ maxWidth: 320 }}
              value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            <select className="form-select" style={{ width: 'auto' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Dept · Year</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{u.email}</td>
                    <td style={{ fontSize: 13 }}>{[u.department, u.year].filter(Boolean).join(' · ') || '—'}</td>
                    <td>
                      <select style={{ border: '1px solid var(--gray-200)', borderRadius: 6, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}
                        value={u.role} onChange={e => changeRole(u.id, e.target.value)}>
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-xs" onClick={() => toggleUser(u.id, u.is_active)}>
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                        <button className="btn btn-danger btn-xs btn-icon" onClick={() => deleteUser(u.id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Create user modal */}
          {showCreateUser && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateUser(false)}>
              <div className="modal">
                <div className="modal-header">
                  <span className="modal-title">Add New User</span>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateUser(false)}><X size={18} /></button>
                </div>
                <form onSubmit={createUser}>
                  <div className="modal-body">
                    {['name', 'email', 'password'].map(k => (
                      <div className="form-group" key={k}>
                        <label className="form-label" style={{ textTransform: 'capitalize' }}>{k} *</label>
                        <input className="form-input" type={k === 'password' ? 'password' : 'text'} required
                          value={newUser[k]} onChange={e => setNewUser(u => ({ ...u, [k]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select className="form-select" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="grid-2" style={{ gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Department</label>
                        <input className="form-input" value={newUser.department} onChange={e => setNewUser(u => ({ ...u, department: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Year</label>
                        <input className="form-input" value={newUser.year} onChange={e => setNewUser(u => ({ ...u, year: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline" onClick={() => setShowCreateUser(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary"><UserPlus size={15} /> Create User</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Announcements */}
      {tab === 'announce' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Active Announcements</h2>
            {announcements.length === 0 ? (
              <div className="empty-state"><Bell size={40} className="empty-icon" /><div className="empty-title">No announcements</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {announcements.map(a => (
                  <div key={a.id} className={`announcement-card ${a.priority}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</span>
                        <span className={`badge badge-${a.priority === 'high' ? 'red' : a.priority === 'medium' ? 'blue' : 'gold'}`}>{a.priority}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5 }}>{a.content}</p>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 8 }}>
                        Posted by {a.creator_name} · {new Date(a.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={() => deleteAnn(a.id)}><Trash2 size={14} color="var(--red)" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Post Announcement</h2>
            <form onSubmit={postAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" placeholder="Announcement title" required
                  value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-input" placeholder="Write your announcement..." required
                  value={annForm.content} onChange={e => setAnnForm(f => ({ ...f, content: e.target.value }))} style={{ minHeight: 100 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['low', 'medium', 'high'].map(p => (
                    <button key={p} type="button" onClick={() => setAnnForm(f => ({ ...f, priority: p }))}
                      style={{
                        flex: 1, padding: '7px', border: `2px solid ${annForm.priority === p ? (p === 'high' ? 'var(--red)' : p === 'medium' ? 'var(--blue)' : 'var(--gold)') : 'var(--gray-200)'}`,
                        borderRadius: 'var(--radius-sm)', background: annForm.priority === p ? (p === 'high' ? 'rgba(192,57,43,0.08)' : p === 'medium' ? 'rgba(26,95,168,0.08)' : 'var(--gold-pale)') : '#fff',
                        color: p === 'high' ? 'var(--red)' : p === 'medium' ? 'var(--blue)' : '#7a5f1a',
                        cursor: 'pointer', fontSize: 13, fontWeight: 500, textTransform: 'capitalize', transition: 'all 0.15s'
                      }}>{p}</button>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                <Bell size={15} /> Post Announcement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
