import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Droplets,
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  UserRound,
  Bookmark,
  Shield,
  X,
  FileText,
  Video,
  BookOpen,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const leave = () => {
    logout();
    navigate('/knowledge');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/knowledge" className="brand">
            <span className="brand-mark"><Droplets size={21} /></span>
            <span>waterwise<span className="brand-light"> india</span></span>
          </NavLink>

          <button
            className="mobile-menu icon-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>

          <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
            <NavLink
              to="/knowledge"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => setMenuOpen(false)}
            >
              Knowledge Library
            </NavLink>
            <NavLink
              to="/resources"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => setMenuOpen(false)}
            >
              Resources & Videos
            </NavLink>
            <NavLink
              to="/forum"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => setMenuOpen(false)}
            >
              Community Forum
            </NavLink>
            <a
              href="#calculator"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                alert('Water conservation calculator is managed under Module C.');
              }}
            >
              Water Calculator
            </a>
            {user?.role === 'ADMIN' && (
              <NavLink
                to="/admin"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setMenuOpen(false)}
              >
                Admin Dashboard
              </NavLink>
            )}
          </nav>

          <div className="top-actions">
            <button
              className="icon-button search-button"
              aria-label="Search"
              onClick={() => navigate('/knowledge')}
            >
              <Search size={19} />
            </button>
            <button className="icon-button notification-button" aria-label="Notifications">
              <Bell size={19} />
              <i />
            </button>

            {user ? (
              <div className="profile-menu-wrap">
                <button
                  className="profile-trigger"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <span className="avatar avatar-small">
                    {user.name
                      ?.split(' ')
                      .map((x) => x[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="profile-trigger-name">{user.name?.split(' ')[0]}</span>
                  <ChevronDown size={15} />
                </button>

                {profileOpen && (
                  <div className="dropdown">
                    {user?.role === 'ADMIN' && (
                      <NavLink to="/admin" onClick={() => setProfileOpen(false)}>
                        <Shield size={16} /> Admin Dashboard
                      </NavLink>
                    )}
                    <NavLink to="/profile" onClick={() => setProfileOpen(false)}>
                      <UserRound size={16} /> My profile
                    </NavLink>
                    <NavLink to="/my-articles" onClick={() => setProfileOpen(false)}>
                      <FileText size={16} /> My articles
                    </NavLink>
                    <NavLink to="/bookmarks" onClick={() => setProfileOpen(false)}>
                      <Bookmark size={16} /> Saved articles
                    </NavLink>
                    <button onClick={leave}>
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <NavLink className="button button-primary button-small" to="/login">
                Sign in
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="page-container">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="brand footer-brand">
            <span className="brand-mark"><Droplets size={18} /></span>
            <span>waterwise<span className="brand-light"> india</span></span>
          </div>
          <span>Digital Knowledge Sharing Platform for Water Efficiency & Scarcity Mitigation.</span>
          <span>&copy; 2026 Bureau of Water Use Efficiency, Ministry of Jal Shakti</span>
        </div>
      </footer>
    </div>
  );
}
