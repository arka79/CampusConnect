import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import FilesPage from './pages/FilesPage'
import ChatPage from './pages/ChatPage'
import GroupsPage from './pages/GroupsPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'

const ProtectedRoute = ({ children, adminOnly }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1F3A' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner gold" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading Adamas University...</div>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
