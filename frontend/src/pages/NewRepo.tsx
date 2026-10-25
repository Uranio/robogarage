import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';

export default function NewRepo() {
  const me = useSession();
  const [f, setF] = useState({ name: '', description: '', visibility: 'public', kind: 'skill', plugin_target: 'claude' });  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  if (!me) return <Navigate to="/login" replace />;

  const submit = async () => {
    setErr('');
    if (!f.name.trim()) { setErr('Give the skill a name [a-z0-9-]'); return; }
    setBusy(true);
    try {
      const r = await api.createRepo({ ...f, owner: me });
      nav(`/r/${r.id}`);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ paddingTop: 22 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage init</div>
      <h2>new skill <span className="blink grn">▊</span></h2>
      <div className="panel pad" style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
        <div><span className="dim">Owner</span> <span className="grn">{me}</span> <span className="dim">(your account)</span></div>
        <label><div className="dim">Skill name [a-z0-9-]</div>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="web-scraper" /></label>
        <label><div className="dim">Description</div>
          <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What does the skill do?" /></label>
        <div className="row">
          <label className="grow"><div className="dim">Type</div>
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              <option value="skill">Skill — SKILL.md + scripts</option>
              <option value="agent">Agent — AGENT.md persona</option>
              <option value="plugin">Plugin — multi-tool bundle</option>
            </select></label>
          {f.kind === 'plugin' && (
            <label className="grow"><div className="dim">Plugin target</div>
              <select value={f.plugin_target} onChange={(e) => setF({ ...f, plugin_target: e.target.value })}>
                <option value="claude">Claude Code</option>
                <option value="opencode">OpenCode</option>
                <option value="codex">Codex</option>
                <option value="cursor">Cursor</option>
                <option value="gemini">Gemini CLI</option>
              </select></label>
          )}
        </div>
        <label><div className="dim">Visibility</div>
          <select value={f.visibility} onChange={(e) => setF({ ...f, visibility: e.target.value })}>
            <option value="public">Public — listed in Explore</option>
            <option value="private">Private — only you and members</option>
          </select></label>
        {err && <div className="amb">{err}</div>}
        <div className="row"><button className="amber" disabled={busy} onClick={submit}>{busy ? '$ working…' : '$ init + scaffold'}</button><Link to="/" className="dim" style={{ fontSize: 12 }}>cancel</Link></div>
        <div className="dim" style={{ fontSize: 12 }}>Creates a working repo + SKILL.md, references/, scripts/, examples/, tests/, skill.json, README, CHANGELOG.</div>
      </div>
    </div>
  );
}
