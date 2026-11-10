import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/common/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Forum from './pages/Forum'
import PostDetails from './pages/PostDetails'
import Profile from './pages/Profile'
import Bookmarks from './pages/Bookmarks'
import { useAuth } from './hooks/useAuth'

function Protected({ children }) {
  const { user } = useAuth()
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
        <Route path="*" element={<Navigate to="/forum" replace />} />
      </Route>
    </Routes>
  )
}
