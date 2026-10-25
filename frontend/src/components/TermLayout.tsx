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
  const logout = () => { clearSession(); nav('/'); };
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
          <span className="logo row" style={{ gap: 8 }}>robogarage<WrenchIcon size={15} /><b>_</b></span>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : '')}>~/home</NavLink>
            <NavLink to="/skills" className={({ isActive }) => (isActive ? 'on' : '')}>~/skills</NavLink>
            <NavLink to="/import" className={({ isActive }) => (isActive ? 'on' : '')}>↓ import</NavLink>
            <NavLink to="/new" className={({ isActive }) => (isActive ? 'on' : '')}>+ new</NavLink>
          </nav>
          <span className="grow" />
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
            <span className="row">
              <Link to="/login" style={{ fontSize: 12 }}>Sign in</Link>
              <Link to="/register" style={{ fontSize: 12 }}><button className="amber" style={{ padding: '4px 10px', fontSize: 12 }}>Register</button></Link>
            </span>
          )}
        </div>
      </div>
      <div className="wrap"><Outlet /></div>
    </>
  );
}
