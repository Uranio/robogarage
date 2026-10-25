import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { setSession, useSession } from '../lib/session';

export default function Login() {
  const me = useSession();
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (me) nav('/'); }, [me, nav]);

  const login = async () => {
    setErr('');
    if (!identifier.trim() || !password) { setErr('Enter your email (or username) and password'); return; }
    setBusy(true);
    try {
      const u = await api.login(identifier, password);
      setSession(u.username, u.avatar_url || null, u.token);
      nav('/');
    } catch (e: any) {
      setErr(e.message);
    }
    finally { setBusy(false); }
  };

  return (
    <div style={{ paddingTop: 22 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage login</div>
      <h2>welcome back <span className="blink grn">▊</span></h2>
      <div className="panel pad" style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
        <label><div className="dim">Email or username</div>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com" autoComplete="email" onKeyDown={(e) => e.key === 'Enter' && login()} /></label>
        <label><div className="dim">Password</div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••" autoComplete="current-password" onKeyDown={(e) => e.key === 'Enter' && login()} /></label>
          <div><button onClick={login} disabled={busy}>{busy ? 'Checking…' : 'Sign in →'}</button></div>
          <div className="dim" style={{ fontSize: 13 }}><Link to="/recover">Forgot password?</Link></div>

        {err && <div className="amb">{err}</div>}
        <div className="dim" style={{ fontSize: 13 }}>No account yet? <Link to="/register">Create one →</Link></div>
      </div>
    </div>
  );
}
