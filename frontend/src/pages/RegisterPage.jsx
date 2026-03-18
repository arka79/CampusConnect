import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { BookOpen } from 'lucide-react'

const DEPTS = ['CSE', 'ECE', 'EEE', 'ME', 'CE', 'BCA', 'MCA', 'MBA', 'BBA', 'Law', 'Pharmacy', 'Other']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG 1st Year', 'PG 2nd Year', 'Faculty']

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', year: '', role: 'student' })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handle = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Welcome to Adamas.')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-decoration" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 48, height: 48, background: 'var(--gold)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={24} color="#0B1F3A" />
            </div>
            <div>
              <div style={{ fontFamily: 'Playfair Display', color: '#fff', fontSize: 20, fontWeight: 700 }}>Adamas University</div>
              <div style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Learning Platform</div>
            </div>
          </div>
          <h1 style={{ fontFamily: 'Playfair Display', color: '#fff', fontSize: 38, lineHeight: 1.2, marginBottom: 20 }}>
            Join the campus<br />community.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.7 }}>
            Upload notes, download study materials, join study groups, and collaborate with fellow Adamas students.
          </p>
        </div>
      </div>

      <div className="auth-right" style={{ overflowY: 'auto' }}>
        <form className="auth-form" onSubmit={handle}>
          <h2 style={{ fontSize: 26, marginBottom: 6 }}>Create Account</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
            Register with your student or faculty details
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="Rahul Sharma" value={form.name}
                onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@adamas.ac.in" value={form.email}
                onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min. 6 characters" value={form.password}
                onChange={e => set('password', e.target.value)} required minLength={6} />
            </div>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                  <option value="">Select dept</option>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <select className="form-select" value={form.year} onChange={e => set('year', e.target.value)}>
                  <option value="">Select year</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">I am a</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['student', 'faculty'].map(r => (
                  <button key={r} type="button" onClick={() => set('role', r)}
                    style={{
                      flex: 1, padding: '9px', border: `2px solid ${form.role === r ? 'var(--navy)' : 'var(--gray-200)'}`,
                      borderRadius: 'var(--radius)', background: form.role === r ? 'var(--navy)' : 'transparent',
                      color: form.role === r ? '#fff' : 'var(--gray-500)', fontSize: 14, fontWeight: 500,
                      cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize'
                    }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', marginTop: 22, padding: '12px', justifyContent: 'center', fontSize: 15 }}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Create Account'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: 'var(--gray-500)' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: 'var(--navy)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
