import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function Reset() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr('');
    if (!token) { setErr('Missing reset token — request a new link.'); return; }
    if (pw.password.length < 8) { setErr('Password: at least 8 characters'); return; }
    if (pw.password !== pw.confirm) { setErr('Passwords do not match'); return; }
    setBusy(true);
    try {
      await api.resetPassword(token, pw.password);
      setDone(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ paddingTop: 22 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage reset</div>
      <h2>choose a new password <span className="blink grn">▊</span></h2>
      <div className="panel pad" style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
        {done ? (
          <div className="grn">✓ Password updated. <Link to="/login">Sign in →</Link></div>
        ) : (
          <>
            <div className="row">
              <label className="grow"><div className="dim">New password (8+ chars)</div>
                <input type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} placeholder="••••••" autoComplete="new-password" /></label>
              <label className="grow"><div className="dim">Confirm</div>
                <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} placeholder="••••••" autoComplete="new-password" onKeyDown={(e) => e.key === 'Enter' && submit()} /></label>
            </div>
            <div><button className="amber" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Set new password'}</button></div>
            {err && <div className="amb">{err} — <Link to="/recover">request a new link</Link></div>}
          </>
        )}
      </div>
    </div>
  );
}
