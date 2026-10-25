import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { setSession, useSession } from '../lib/session';
import { COLORS, USER_RE, EMAIL_RE, Check, idleCheck, Status } from '../components/AuthBits';

export default function Register() {
  const me = useSession();
  const nav = useNavigate();
  const [reg, setReg] = useState({ username: '', email: '', display_name: '', color: COLORS[0], password: '', confirm: '' });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [checkUser, setCheckUser] = useState<Check>(idleCheck);
  const [checkMail, setCheckMail] = useState<Check>(idleCheck);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const timerU = useRef<any>(null);
  const timerM = useRef<any>(null);

  useEffect(() => { if (me) nav('/'); }, [me, nav]);

  // live username availability check (400ms debounce)
  useEffect(() => {
    const v = reg.username.trim().toLowerCase();
    if (!v) { setCheckUser(idleCheck); return; }
    if (!USER_RE.test(v)) {
      setCheckUser({ state: 'invalid', msg: 'Format: 2–24 chars, lowercase, numbers, hyphens' });
      return;
    }
    setCheckUser({ state: 'checking', msg: 'Checking availability…' });
    clearTimeout(timerU.current);
    timerU.current = setTimeout(async () => {
      try {
        const r = await api.checkUsername(v);
        setCheckUser(r.available
          ? { state: 'ok', msg: `✓ ${r.username} is available` }
          : { state: 'taken', msg: `✗ ${r.username} is already taken` });
      } catch { setCheckUser(idleCheck); }
    }, 400);
    return () => clearTimeout(timerU.current);
  }, [reg.username]);

  // live email availability check (500ms debounce)
  useEffect(() => {
    const v = reg.email.trim().toLowerCase();
    if (!v) { setCheckMail(idleCheck); return; }
    if (!EMAIL_RE.test(v)) {
      setCheckMail({ state: 'invalid', msg: 'Enter a valid email address' });
      return;
    }
    setCheckMail({ state: 'checking', msg: 'Checking email…' });
    clearTimeout(timerM.current);
    timerM.current = setTimeout(async () => {
      try {
        const r = await api.checkEmail(v);
        setCheckMail(r.available
          ? { state: 'ok', msg: '✓ email available' }
          : { state: 'taken', msg: '✗ email already registered — try signing in' });
      } catch { setCheckMail(idleCheck); }
    }, 500);
    return () => clearTimeout(timerM.current);
  }, [reg.email]);

  const onFile = (f: File | undefined) => {
    if (!f) { setAvatar(null); setPreview(null); return; }
    if (!f.type.startsWith('image/')) { setErr('Pick an image file (png, jpg, gif, webp)'); return; }
    if (f.size > 2 * 1024 * 1024) { setErr('Image too large: 2 MB max'); return; }
    setErr('');
    setAvatar(f);
    setPreview(URL.createObjectURL(f));
  };

  const register = async () => {
    setErr('');
    if (checkUser.state !== 'ok') { setErr(checkUser.state === 'taken' ? 'Username taken — pick another one' : 'Pick a valid, available username'); return; }
    if (checkMail.state !== 'ok') { setErr(checkMail.state === 'taken' ? 'Email already registered — try signing in' : 'Enter a valid email address'); return; }
    if (reg.password.length < 8) { setErr('Password: at least 8 characters'); return; }
    if (reg.password !== reg.confirm) { setErr('Passwords do not match'); return; }
    setBusy(true);
    try {
      const u = await api.createUser({
        username: reg.username.trim().toLowerCase(),
        email: reg.email.trim().toLowerCase(),
        display_name: reg.display_name.trim() || reg.username.trim().toLowerCase(),
        color: reg.color,
        password: reg.password,
      });
      let avatarUrl: string | null = null;
      if (avatar) {
        try {
          const up = await api.uploadAvatar(u.id, avatar);
          avatarUrl = up.avatar_url || null;
        } catch (e: any) { setErr(`Account created, but the avatar failed: ${e.message}`); }
      }
      setSession(u.username, avatarUrl, u.token);
      nav('/');
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const kb = avatar ? (avatar.size / 1024 < 1024 ? `${Math.round(avatar.size / 1024)} KB` : `${(avatar.size / 1024 / 1024).toFixed(1)} MB`) : '';

  return (
    <div style={{ paddingTop: 22 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage register</div>
      <h2>create your account <span className="blink grn">▊</span></h2>
      <div className="panel pad" style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
        <div className="row">
          {preview
            ? <img src={preview} alt="preview" width={64} height={64} style={{ borderRadius: 10, objectFit: 'cover' }} />
            : <span className="avatar" style={{ background: reg.color, width: 64, height: 64, lineHeight: '64px', fontSize: 28 }}>
                {(reg.username[0] || '?').toUpperCase()}
              </span>}
          <div className="grow">
            <div className="dim" style={{ marginBottom: 6 }}>Profile image (2 MB max)</div>
            <label className="filebtn">
              <input type="file" accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(e) => onFile(e.target.files?.[0])} />
              <span>{avatar ? `✓ ${avatar.name} · ${kb}` : '▸ Choose image…'}</span>
            </label>
          </div>
        </div>
        <label><div className="dim">Username [a-z0-9-]</div>
          <input value={reg.username} onChange={(e) => setReg({ ...reg, username: e.target.value })} placeholder="your-name" autoComplete="username" /></label>
        <Status check={checkUser} pending={`$ whois ${reg.username.trim().toLowerCase()}…`} />
        <label><div className="dim">Email</div>
          <input type="email" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} placeholder="you@example.com" autoComplete="email" /></label>
        <Status check={checkMail} pending="$ checking email…" />
        <label><div className="dim">Display name</div>
          <input value={reg.display_name} onChange={(e) => setReg({ ...reg, display_name: e.target.value })} placeholder="Your Name" /></label>
        <div className="row">
          <label className="grow"><div className="dim">Password (8+ chars)</div>
            <input type="password" value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} placeholder="••••••" autoComplete="new-password" /></label>
          <label className="grow"><div className="dim">Confirm</div>
            <input type="password" value={reg.confirm} onChange={(e) => setReg({ ...reg, confirm: e.target.value })} placeholder="••••••" autoComplete="new-password" /></label>
        </div>
        <div>
          <div className="dim" style={{ marginBottom: 6 }}>Avatar color (fallback without image)</div>
          <div className="row">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setReg({ ...reg, color: c })}
                style={{ background: c, borderColor: reg.color === c ? '#fff' : c, width: 34, height: 30, padding: 0 }}
                aria-label={c} />
            ))}
          </div>
        </div>
        <div><button className="amber" disabled={busy || checkUser.state !== 'ok' || checkMail.state !== 'ok'} onClick={register}>
          {busy ? 'Creating…' : '+ Create account'}</button></div>
        {err && <div className="amb">{err}</div>}
        <div className="dim" style={{ fontSize: 13 }}>Have an account? <Link to="/login">Sign in →</Link></div>
      </div>
    </div>
  );
}
