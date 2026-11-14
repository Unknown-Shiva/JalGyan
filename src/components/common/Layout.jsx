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
import { useTranslation } from 'react-i18next';
import { languages } from '../../i18n';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { t, i18n } = useTranslation();

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
            aria-label={t('nav.toggleMenu')}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>

          <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
            <NavLink
              to="/knowledge"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => setMenuOpen(false)}
            >
              {t('nav.knowledge')}
            </NavLink>
            <NavLink
              to="/resources"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => setMenuOpen(false)}
            >
              {t('nav.resources')}
            </NavLink>
            <NavLink
              to="/forum"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => setMenuOpen(false)}
            >
              {t('nav.community')}
            </NavLink>
            <NavLink
              to="/calculator"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => setMenuOpen(false)}
            >
              {t('nav.calculator')}
            </NavLink>
            {user?.role === 'ADMIN' && (
              <NavLink
                to="/admin"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.admin')}
              </NavLink>
            )}
          </nav>

          <div className="top-actions">
            <button
              className="icon-button search-button"
              aria-label={t('nav.search')}
              onClick={() => navigate('/knowledge')}
            >
              <Search size={19} />
            </button>
            <button className="icon-button notification-button" aria-label={t('nav.notifications')}>
              <Bell size={19} />
              <i />
            </button>

            <label className="language-picker">
              <span className="sr-only">{t('language')}</span>
              <select
                aria-label={t('language')}
                value={i18n.resolvedLanguage || 'en'}
                onChange={(event) => i18n.changeLanguage(event.target.value)}
              >
                {languages.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
              </select>
            </label>

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
                        <Shield size={16} /> {t('nav.admin')}
                      </NavLink>
                    )}
                    <NavLink to="/profile" onClick={() => setProfileOpen(false)}>
                      <UserRound size={16} /> {t('nav.profile')}
                    </NavLink>
                    <NavLink to="/my-articles" onClick={() => setProfileOpen(false)}>
                      <FileText size={16} /> {t('nav.myArticles')}
                    </NavLink>
                    <NavLink to="/bookmarks" onClick={() => setProfileOpen(false)}>
                      <Bookmark size={16} /> {t('nav.saved')}
                    </NavLink>
                    <button onClick={leave}>
                      <LogOut size={16} /> {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <NavLink className="button button-primary button-small" to="/login">
                {t('nav.signIn')}
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
          <span>{t('footer.tagline')}</span>
          <span>{t('footer.copyright')}</span>
        </div>
      </footer>
    </div>
  );
}
