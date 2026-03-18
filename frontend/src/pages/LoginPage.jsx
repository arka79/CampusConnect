import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { BookOpen, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-decoration" />
        <div className="auth-decoration" style={{ width: 600, height: 600, top: -200, right: -200, borderColor: 'rgba(201,168,76,0.08)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{ width: 48, height: 48, background: 'var(--gold)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={24} color="#0B1F3A" />
            </div>
            <div>
              <div className="auth-logo" style={{ fontSize: 22, margin: 0 }}>Adamas University</div>
              <div style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Learning Platform</div>
            </div>
          </div>
          <h1 style={{ fontFamily: 'Playfair Display', color: '#fff', fontSize: 42, lineHeight: 1.2, marginBottom: 20 }}>
            Your knowledge<br />hub awaits.
          </h1>
          <p className="auth-tagline">
            Access lecture notes, exam papers, study groups, and real-time campus chat — all in one place.
          </p>
          <div style={{ display: 'flex', gap: 24, marginTop: 40 }}>
            {[['500+', 'Study Materials'], ['2000+', 'Active Students'], ['50+', 'Study Groups']].map(([n, l]) => (
              <div key={l}>
                <div style={{ color: 'var(--gold)', fontSize: 22, fontWeight: 700, fontFamily: 'DM Sans' }}>{n}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <form className="auth-form" onSubmit={handle}>
          <h2 style={{ fontSize: 26, marginBottom: 6 }}>Sign In</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>
            Use your university email to continue
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@adamas.ac.in"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  style={{ paddingRight: 44 }}
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', marginTop: 24, padding: '12px', justifyContent: 'center', fontSize: 15 }}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Sign In'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--gray-500)' }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--navy)', fontWeight: 600 }}>Register here</Link>
          </p>

          <div style={{ marginTop: 24, padding: 14, background: 'var(--gray-50)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--gray-500)', textAlign: 'center' }}>
            Demo: <strong>admin@adamas.ac.in</strong> / <strong>admin123</strong>
          </div>
        </form>
      </div>
    </div>
  )
}
