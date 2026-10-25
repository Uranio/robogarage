import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Recover() {
  const [identifier, setIdentifier] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!identifier.trim() || busy) return;
    setBusy(true);
    try {
      await api.recover(identifier);
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ paddingTop: 22 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage recover</div>
      <h2>reset your password <span className="blink grn">▊</span></h2>
      <div className="panel pad" style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
        {done ? (
          <div className="grn">✓ If an account exists for <b>{identifier.trim()}</b>, a reset link is on its way (valid 30 minutes).</div>
        ) : (
          <>
            <label><div className="dim">Email or username</div>
              <input value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com" autoComplete="email" onKeyDown={(e) => e.key === 'Enter' && send()} /></label>
            <div><button onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send reset link →'}</button></div>
          </>
        )}
        <div className="dim" style={{ fontSize: 13 }}><Link to="/login">← back to sign in</Link></div>
      </div>
    </div>
  );
}
