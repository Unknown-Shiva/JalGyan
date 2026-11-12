import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/common/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Forum from './pages/Forum'
import PostDetails from './pages/PostDetails'
import Profile from './pages/Profile'
import Bookmarks from './pages/Bookmarks'
import AdminRoute from './components/admin/AdminRoute'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import ArticleModeration from './pages/admin/ArticleModeration'
import UserManagement from './pages/admin/UserManagement'
import ReportModeration from './pages/admin/ReportModeration'
import AdminActivity from './pages/admin/AdminActivity'
import { useAuth } from './hooks/useAuth'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-state">Verifying session...</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/forum" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/forum/:id" element={<PostDetails />} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/bookmarks" element={<Protected><Bookmarks /></Protected>} />

        {/* Admin section — strictly protected by AdminRoute */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="articles" element={<ArticleModeration />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="reports" element={<ReportModeration />} />
          <Route path="activity" element={<AdminActivity />} />
        </Route>

        <Route path="*" element={<Navigate to="/forum" replace />} />
      </Route>
    </Routes>
  )
}
