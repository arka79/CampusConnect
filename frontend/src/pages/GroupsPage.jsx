import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Plus, Users, Lock, Globe, X, Search, MessageSquare } from 'lucide-react'

const COLORS = ['#0B1F3A', '#C9A84C', '#1A5FA8', '#1A7A4A', '#8B4A9C', '#C0392B', '#E67E22']
const DEPTS = ['CSE', 'ECE', 'EEE', 'ME', 'CE', 'BCA', 'MCA', 'MBA', 'General']

function CreateModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', description: '', department: '', is_private: false })
  const [loading, setLoading] = useState(false)
  const nameRef = useRef()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    // focus name input and close on Esc
    nameRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/groups', form)
      toast.success('Study group created!')
      onSuccess()
      onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create group') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
        <div className="modal-header">
          <span id="create-modal-title" className="modal-title">Create Study Group</span>
          <button aria-label="Close create dialog" className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Group Name *</label>
              <input ref={nameRef} className="form-input" placeholder="e.g. CSE 3rd Year DBMS" value={form.name}
                onChange={e => set('name', e.target.value)} required aria-required="true" />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">All departments</option>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" placeholder="What will this group study?" value={form.description}
                onChange={e => set('description', e.target.value)} style={{ minHeight: 80 }} />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 10 }}>Privacy</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ val: false, icon: Globe, label: 'Public', sub: 'Anyone can join' },
                  { val: true, icon: Lock, label: 'Private', sub: 'Invite only' }].map(opt => (
                  <div key={String(opt.val)} onClick={() => set('is_private', opt.val)}
                    style={{
                      flex: 1, border: `2px solid ${form.is_private === opt.val ? 'var(--navy)' : 'var(--gray-200)'}`,
                      borderRadius: 'var(--radius)', padding: '12px', cursor: 'pointer',
                      background: form.is_private === opt.val ? 'rgba(11,31,58,0.04)' : '#fff',
                      transition: 'all 0.15s'
                    }}>
                    <opt.icon size={18} color={form.is_private === opt.val ? 'var(--navy)' : 'var(--gray-400)'} />
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: form.is_private === opt.val ? 'var(--navy)' : 'var(--gray-700)' }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{opt.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><Plus size={16} /> Create Group</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MembersModal({ group, onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const closeRef = useRef()

  useEffect(() => {
    api.get(`/groups/${group.id}/members`)
      .then(res => setMembers(res.data.members || []))
      .finally(() => setLoading(false))
  }, [group.id])

  useEffect(() => {
    // focus close button and close on Esc
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="members-modal-title">
        <div className="modal-header">
          <span id="members-modal-title" className="modal-title">{group.name} — Members</span>
          <button aria-label="Close members dialog" ref={closeRef} className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {loading ? <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
            : members.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>No members yet</div>
            : members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--gray-50)' }}>
                <div className="avatar sm">{m.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{m.department} · {m.year}</div>
                </div>
                {m.role === 'admin' && <span className="badge badge-gold">Admin</span>}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'SG'
}

export default function GroupsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [viewMembers, setViewMembers] = useState(null)

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const res = await api.get('/groups')
      setGroups(res.data.groups || [])
    } catch { toast.error('Failed to load groups') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchGroups() }, [])

  const handleJoin = async (id) => {
    try {
      await api.post(`/groups/${id}/join`)
      toast.success('Joined group!')
      fetchGroups()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to join') }
  }

  const handleLeave = async (id) => {
    if (!confirm('Leave this group?')) return
    try {
      await api.delete(`/groups/${id}/leave`)
      toast.success('Left group')
      fetchGroups()
    } catch { toast.error('Failed to leave') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this group? All messages will be lost.')) return
    try {
      await api.delete(`/groups/${id}`)
      toast.success('Group deleted')
      fetchGroups()
    } catch { toast.error('Failed to delete') }
  }

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description?.toLowerCase().includes(search.toLowerCase()) ||
    g.department?.toLowerCase().includes(search.toLowerCase())
  )

  const myGroups = filtered.filter(g => g.is_member)
  const otherGroups = filtered.filter(g => !g.is_member)

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Study Groups</h1>
          <p className="page-subtitle">Create or join groups for collaborative learning</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Group
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
        <input className="form-input" placeholder="Search groups..." style={{ paddingLeft: 38, maxWidth: 400 }}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 140, background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-100)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <>
          {myGroups.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} /> My Groups ({myGroups.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {myGroups.map(g => (
                  <div key={g.id} className="group-card">
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                      <div className="group-avatar" style={{ background: g.avatar_color }}>{getInitials(g.name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)' }} className="truncate">{g.name}</div>
                          {g.is_private ? <Lock size={12} color="var(--gray-400)" /> : <Globe size={12} color="var(--gray-400)" />}
                        </div>
                        {g.department && <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{g.department}</div>}
                      </div>
                    </div>
                    {g.description && <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12, lineHeight: 1.5 }} className="truncate">{g.description}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gray-400)' }}>
                        <Users size={12} /> {g.member_count} members
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-xs" onClick={() => setViewMembers(g)}>Members</button>
                        <button className="btn btn-gold btn-xs" onClick={() => navigate(`/chat?group=${g.id}`, { state: { groupId: g.id } })}>
                          <MessageSquare size={12} /> Chat
                        </button>
                        <button className="btn btn-outline btn-xs" onClick={() => handleLeave(g.id)} style={{ marginLeft: 6 }}>
                          Leave
                        </button>
                        {(g.created_by === user?.id || user?.role === 'admin') && (
                          <button className="btn btn-danger btn-xs" onClick={() => handleDelete(g.id)}>Delete</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {otherGroups.length > 0 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)', marginBottom: 14 }}>
                Discover Groups ({otherGroups.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {otherGroups.map(g => (
                  <div key={g.id} className="group-card" style={{ opacity: g.is_private ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                      <div className="group-avatar" style={{ background: g.avatar_color }}>{getInitials(g.name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)' }} className="truncate">{g.name}</div>
                          {g.is_private ? <Lock size={12} color="var(--gray-400)" /> : <Globe size={12} color="var(--gray-400)" />}
                        </div>
                        {g.department && <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{g.department}</div>}
                      </div>
                    </div>
                    {g.description && <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12, lineHeight: 1.5 }}>{g.description}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gray-400)' }}>
                        <Users size={12} /> {g.member_count} members
                      </div>
                      <button className="btn btn-primary btn-xs" onClick={() => handleJoin(g.id)} disabled={g.is_private}>
                        {g.is_private ? 'Private' : 'Join Group'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="empty-state">
              <Users size={48} className="empty-icon" />
              <div className="empty-title">No groups found</div>
              <div className="empty-text">Create a study group and invite your classmates!</div>
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setShowCreate(true)}>
                <Plus size={16} /> Create Group
              </button>
            </div>
          )}
        </>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSuccess={fetchGroups} />}
      {viewMembers && <MembersModal group={viewMembers} onClose={() => setViewMembers(null)} />}
    </div>
  )
}
