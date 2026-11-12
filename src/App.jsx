import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/common/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Forum from './pages/Forum'
import PostDetails from './pages/PostDetails'
import Profile from './pages/Profile'
import Bookmarks from './pages/Bookmarks'
import AdminRoute from './components/admin/AdminRoute'
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
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <div className="page-container">
                <div className="section-heading">
                  <h2>Admin Dashboard</h2>
                  <p>Welcome to Module C Platform Administration.</p>
                </div>
              </div>
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/forum" replace />} />
      </Route>
    </Routes>
  )
}
