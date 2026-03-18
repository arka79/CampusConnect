import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { User, Save, LogOut } from 'lucide-react'

const DEPTS = ['CSE', 'ECE', 'EEE', 'ME', 'CE', 'BCA', 'MCA', 'MBA', 'BBA', 'Law', 'Pharmacy', 'Other']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG 1st Year', 'PG 2nd Year', 'Faculty']

function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AU'
}

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', department: user?.department || '', year: user?.year || '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.put('/auth/profile', form)
      updateUser(res.data.user)
      toast.success('Profile updated!')
    } catch { toast.error('Update failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 className="page-title" style={{ marginBottom: 4 }}>My Profile</h1>
      <p className="page-subtitle" style={{ marginBottom: 28 }}>Manage your account information</p>

      <div className="card" style={{ marginBottom: 20 }}>
        {/* Avatar header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '4px 0 20px', borderBottom: '1px solid var(--gray-100)', marginBottom: 20 }}>
          <div className="avatar lg" style={{ width: 64, height: 64, fontSize: 20 }}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : getInitials(user?.name)}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', fontFamily: 'Playfair Display' }}>{user?.name}</div>
            <div style={{ fontSize: 14, color: 'var(--gray-500)' }}>{user?.email}</div>
            <span className="badge badge-gold" style={{ marginTop: 6, textTransform: 'capitalize' }}>{user?.role}</span>
          </div>
        </div>

        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={user?.email} disabled style={{ background: 'var(--gray-50)', color: 'var(--gray-400)' }} />
            <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Email cannot be changed. Contact admin if needed.</span>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select</option>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={form.year} onChange={e => set('year', e.target.value)}>
                <option value="">Select</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><Save size={15} /> Save Changes</>}
          </button>
        </form>
      </div>

      {/* Info card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>Account Details</h3>
        {[
          ['Role', user?.role],
          ['Department', user?.department || '—'],
          ['Year', user?.year || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-50)', fontSize: 14 }}>
            <span style={{ color: 'var(--gray-500)' }}>{k}</span>
            <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{v}</span>
          </div>
        ))}
      </div>

      <button className="btn btn-outline" onClick={logout} style={{ color: 'var(--red)', borderColor: 'rgba(192,57,43,0.3)' }}>
        <LogOut size={15} /> Sign Out
      </button>
    </div>
  )
}
