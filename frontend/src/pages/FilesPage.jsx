import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Upload, Download, Trash2, Search, FileText, X, Plus, Filter } from 'lucide-react'

const TYPES = ['All', 'notes', 'paper', 'assignment', 'other']
const DEPTS = ['All', 'CSE', 'ECE', 'EEE', 'ME', 'CE', 'BCA', 'MCA', 'MBA', 'BBA', 'Other']
const YEARS = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year', 'PG 1st Year', 'PG 2nd Year']

const typeColors = {
  notes: { bg: 'rgba(26,95,168,0.1)', color: 'var(--blue)', label: 'NT' },
  paper: { bg: 'rgba(192,57,43,0.1)', color: 'var(--red)', label: 'EX' },
  assignment: { bg: 'rgba(26,122,74,0.1)', color: 'var(--green)', label: 'AS' },
  other: { bg: 'rgba(201,168,76,0.12)', color: '#7a5f1a', label: 'OT' },
}

function UploadModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', file_type: 'notes', department: '', year: '', subject: '' })
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!file) return toast.error('Please select a file')
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
    fd.append('file', file)
    setLoading(true)
    try {
      const res = await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(res.data.message)
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Upload Study Material</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {/* Drop zone */}
            <div className={`upload-zone ${drag ? 'drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files[0]) }}
              onClick={() => inputRef.current.click()}>
              <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png" style={{ display: 'none' }}
                onChange={e => setFile(e.target.files[0])} />
              <div className="upload-zone-icon"><Upload size={32} /></div>
              {file ? (
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--navy)' }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--gray-700)' }}>Drop file here or click to browse</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>PDF, Word, PowerPoint — Max 50MB</div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g. Data Structures Unit 3 Notes" value={form.title}
                onChange={e => set('title', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input className="form-input" placeholder="e.g. Data Structures & Algorithms" value={form.subject}
                onChange={e => set('subject', e.target.value)} />
            </div>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.file_type} onChange={e => set('file_type', e.target.value)}>
                  <option value="notes">Notes</option>
                  <option value="paper">Exam Paper</option>
                  <option value="assignment">Assignment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                  <option value="">Select</option>
                  {DEPTS.slice(1).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={form.year} onChange={e => set('year', e.target.value)}>
                <option value="">Select year</option>
                {YEARS.slice(1).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea className="form-input" placeholder="Brief description of the content..." value={form.description}
                onChange={e => set('description', e.target.value)} style={{ minHeight: 70 }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Uploading...</> : <><Upload size={16} /> Upload File</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FilesPage() {
  const { user } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ type: 'All', dept: 'All', year: 'All' })

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (filters.type !== 'All') params.type = filters.type
      if (filters.dept !== 'All') params.dept = filters.dept
      if (filters.year !== 'All') params.year = filters.year
      const res = await api.get('/files', { params })
      setFiles(res.data.files || [])
    } catch { toast.error('Failed to load files') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchFiles() }, [filters])
  useEffect(() => {
    const t = setTimeout(fetchFiles, 400)
    return () => clearTimeout(t)
  }, [search])

  const handleDownload = async (f) => {
    try {
      const res = await api.post(`/files/${f.id}/download`)
      window.open(res.data.url, '_blank')
      setFiles(prev => prev.map(fi => fi.id === f.id ? { ...fi, download_count: fi.download_count + 1 } : fi))
    } catch { toast.error('Download failed') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this file?')) return
    try {
      await api.delete(`/files/${id}`)
      toast.success('File deleted')
      setFiles(prev => prev.filter(f => f.id !== id))
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed') }
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Files & Notes</h1>
          <p className="page-subtitle">Study materials uploaded by students and faculty</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
          <Plus size={16} /> Upload File
        </button>
      </div>

      {/* Search + Filters */}
      <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" placeholder="Search by title or subject..." style={{ paddingLeft: 38 }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }}>TYPE</span>
            <div className="filter-bar">
              {TYPES.map(t => (
                <button key={t} className={`filter-chip ${filters.type === t ? 'active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, type: t }))}>
                  {t === 'All' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }}>DEPT</span>
            <select className="form-select" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
              value={filters.dept} onChange={e => setFilters(f => ({ ...f, dept: e.target.value }))}>
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }}>YEAR</span>
            <select className="form-select" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
              value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 100, background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-100)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} className="empty-icon" />
          <div className="empty-title">No files found</div>
          <div className="empty-text">Try changing filters or be the first to upload!</div>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setShowUpload(true)}>
            <Upload size={16} /> Upload Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {files.map(f => {
            const tc = typeColors[f.file_type] || typeColors.other
            return (
              <div key={f.id} className="file-card">
                <div className="file-type-icon" style={{ background: tc.bg, color: tc.color }}>{tc.label}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--navy)' }} className="truncate">{f.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', margin: '3px 0' }}>
                    {[f.department, f.year, f.subject].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <span className={`badge badge-${f.file_type === 'paper' ? 'red' : f.file_type === 'notes' ? 'blue' : 'gray'}`}>
                      {f.file_type}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                      <Download size={10} style={{ display: 'inline', marginRight: 2 }} />{f.download_count}
                    </span>
                    {f.file_size && <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{f.file_size}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
                    by {f.uploader_name} · {new Date(f.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-outline btn-sm btn-icon" title="Download" onClick={() => handleDownload(f)}>
                    <Download size={14} />
                  </button>
                  {(f.uploaded_by === user?.id || user?.role === 'admin') && (
                    <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => handleDelete(f.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={fetchFiles} />}
    </div>
  )
}
