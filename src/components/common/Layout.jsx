import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Droplets, Menu, Search, Bell, ChevronDown, LogOut, UserRound, Bookmark, MessageCircle, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const leave = () => { logout(); navigate('/forum') }
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/forum" className="brand">
            <span className="brand-mark"><Droplets size={21} /></span>
            <span>waterwise<span className="brand-light"> india</span></span>
          </NavLink>
          <button className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
          <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
            <NavLink to="/forum" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Community</NavLink>
            <a href="#knowledge" className="nav-link" onClick={e => { e.preventDefault(); navigate('/forum') }}>Knowledge library</a>
            <a href="#calculator" className="nav-link" onClick={e => e.preventDefault()}>Water calculator</a>
          </nav>
          <div className="top-actions">
            <button className="icon-button search-button" aria-label="Search"><Search size={19}/></button>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19}/><i /></button>
            {user ? (
              <div className="profile-menu-wrap">
                <button className="profile-trigger" onClick={() => setProfileOpen(!profileOpen)}>
                  <span className="avatar avatar-small">{user.name?.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}</span>
                  <span className="profile-trigger-name">{user.name?.split(' ')[0]}</span><ChevronDown size={15}/>
                </button>
                {profileOpen && <div className="dropdown">
                  <NavLink to="/profile" onClick={() => setProfileOpen(false)}><UserRound size={16}/> My profile</NavLink>
                  <NavLink to="/bookmarks" onClick={() => setProfileOpen(false)}><Bookmark size={16}/> Saved articles</NavLink>
                  <button onClick={leave}><LogOut size={16}/> Sign out</button>
                </div>}
              </div>
            ) : <NavLink className="button button-primary button-small" to="/login">Sign in</NavLink>}
          </div>
        </div>
      </header>
      <main className="page-container"><Outlet /></main>
      <footer className="footer"><div className="footer-inner"><div className="brand footer-brand"><span className="brand-mark"><Droplets size={18}/></span><span>waterwise<span className="brand-light"> india</span></span></div><span>Knowledge shared. Water saved.</span><span>© 2026 WaterWise India</span></div></footer>
    </div>
  )
}
