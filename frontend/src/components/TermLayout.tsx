import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import WrenchIcon from './WrenchIcon';
import { clearSession, useSession, useSessionAvatar } from '../lib/session';

function currentTheme(): string {
  try {
    return localStorage.getItem('robogarage_theme') || 'dark';
  } catch {
    return 'dark';
  }
}

export default function TermLayout() {
  const me = useSession();
  const myAvatar = useSessionAvatar();
  const nav = useNavigate();
  const [theme, setTheme] = useState(currentTheme());
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = () => { clearSession(); nav('/'); setMenuOpen(false); };
  const closeMenu = () => setMenuOpen(false);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('robogarage_theme', next);
    } catch {
      /* noop */
    }
    document.documentElement.dataset.theme = next;
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-in">
          <span className="logo row" onClick={closeMenu} style={{ gap: 8, cursor: 'pointer' }}>
            robogarage<WrenchIcon size={15} /><b>_</b>
          </span>

          <button className="menu-btn" aria-label="Menu" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>

          {/* Desktop row (hidden on mobile via CSS) */}
          <nav className="nav desktop-nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : '')}>~/home</NavLink>
            <NavLink to="/skills" className={({ isActive }) => (isActive ? 'on' : '')}>~/skills</NavLink>
            <NavLink to="/import" className={({ isActive }) => (isActive ? 'on' : '')}>↓ import</NavLink>
            <NavLink to="/new" className={({ isActive }) => (isActive ? 'on' : '')}>+ new</NavLink>
          </nav>

          <span className="grow desktop-spacer" />

          <div className="desktop-actions">
            <button className="ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={toggleTheme} title="Toggle light / dark">
              {theme === 'dark' ? '◐ light' : '◑ dark'}
            </button>
            {me ? (
              <span className="row">
                <Avatar user={{ username: me, avatar_url: myAvatar }} size={20} />
                <span className="grn" style={{ fontSize: 12 }}>{me}@local</span>
                <button className="ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={logout}>Sign out</button>
              </span>
            ) : (
              <>
                <Link to="/login" style={{ fontSize: 12 }}>Sign in</Link>
                <Link to="/register"><button className="amber" style={{ padding: '4px 10px', fontSize: 12 }}>Register</button></Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile overlay menu */}
      {menuOpen && (
        <div className="menu-overlay" data-open={menuOpen ? 'true' : 'false'} onClick={closeMenu}>
          <div className="menu-panel open" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <span className="logo row" style={{ gap: 8 }}>robogarage<WrenchIcon size={15} /><b>_</b></span>
              <button className="menu-close" onClick={closeMenu}>✕</button>
            </div>
            <nav className="nav nav-mobile">
              <NavLink to="/" onClick={closeMenu} className={({ isActive }) => (isActive ? 'on' : '')}>~/home</NavLink>
              <NavLink to="/skills" onClick={closeMenu} className={({ isActive }) => (isActive ? 'on' : '')}>~/skills</NavLink>
              <NavLink to="/import" onClick={closeMenu} className={({ isActive }) => (isActive ? 'on' : '')}>↓ import</NavLink>
              <NavLink to="/new" onClick={closeMenu} className={({ isActive }) => (isActive ? 'on' : '')}>+ new</NavLink>
            </nav>
            <div className="menu-actions" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {me ? (
                <>
                  <button className="amber" onClick={logout}>Sign out</button>
                  <div className="row user-info" style={{ justifyContent: 'center', gap: 8, marginTop: 8 }}>
                    <Avatar user={{ username: me, avatar_url: myAvatar }} size={24} />
                    <span className="grn">{me}@local</span>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="menu-link" style={{ textAlign: 'center', display: 'block', marginBottom: 6 }}>Sign in</Link>
                  <Link to="/register"><button className="amber" style={{ width: '100%' }}>Register</button></Link>
                </>
              )}
              <button className="ghost" onClick={toggleTheme} style={{ textAlign: 'center', width: '100%' }}>
                {theme === 'dark' ? '◐ light' : '◑ dark'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="wrap"><Outlet /></div>
    </>
  );
}
