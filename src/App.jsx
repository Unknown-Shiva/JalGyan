import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/common/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Forum from './pages/Forum';
import PostDetails from './pages/PostDetails';
import Profile from './pages/Profile';
import Bookmarks from './pages/Bookmarks';
import AdminRoute from './components/admin/AdminRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ArticleModeration from './pages/admin/ArticleModeration';
import UserManagement from './pages/admin/UserManagement';
import ReportModeration from './pages/admin/ReportModeration';
import AdminActivity from './pages/admin/AdminActivity';

// Person 1 (Module A: Knowledge Management) Pages
import KnowledgeLibrary from './pages/KnowledgeLibrary';
import ArticleDetails from './pages/ArticleDetails';
import SubmitArticle from './pages/SubmitArticle';
import EditArticle from './pages/EditArticle';
import ResourceLibrary from './pages/ResourceLibrary';
import MyArticles from './pages/MyArticles';

import { useAuth } from './hooks/useAuth';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-state">Verifying session...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Default route to Knowledge Library */}
        <Route path="/" element={<Navigate to="/knowledge" replace />} />

        {/* Module A: Knowledge Management Routes */}
        <Route path="/knowledge" element={<KnowledgeLibrary />} />
        <Route path="/articles" element={<KnowledgeLibrary />} />
        <Route path="/articles/:slug" element={<ArticleDetails />} />
        <Route
          path="/articles/submit"
          element={
            <Protected>
              <SubmitArticle />
            </Protected>
          }
        />
        <Route
          path="/articles/edit/:id"
          element={
            <Protected>
              <EditArticle />
            </Protected>
          }
        />
        <Route path="/resources" element={<ResourceLibrary />} />
        <Route
          path="/my-articles"
          element={
            <Protected>
              <MyArticles />
            </Protected>
          }
        />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Module B: Community & Forum Routes */}
        <Route path="/forum" element={<Forum />} />
        <Route path="/forum/:id" element={<PostDetails />} />
        <Route
          path="/profile"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />
        <Route
          path="/bookmarks"
          element={
            <Protected>
              <Bookmarks />
            </Protected>
          }
        />

        {/* Module C: Admin section */}
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

        <Route path="*" element={<Navigate to="/knowledge" replace />} />
      </Route>
    </Routes>
  );
}
