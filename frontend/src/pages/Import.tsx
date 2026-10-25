import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';

export default function Import() {
  const me = useSession();
  const [customPath, setCustomPath] = useState('');
  const [paste, setPaste] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState('');

  if (!me) return <Navigate to="/login" replace />;

  const done = (r: any) => {
    setMsg({ ok: true, text: `✓ imported as ${r.owner}/${r.name} (${r.visibility})` });
    setBusy('');
  };
  const fail = (e: any) => {
    setMsg({ ok: false, text: `✗ ${e.message}` });
    setBusy('');
  };

  const fromCustom = async () => {
    if (!customPath.trim() || busy) return;
    setMsg(null); setBusy('folder');
    try { done(await api.importPath({ owner: me, source_path: customPath.trim(), visibility })); }
    catch (e: any) { fail(e); }
  };

  const fromPaste = async () => {
    if (!paste.trim() || busy) return;
    setMsg(null); setBusy('paste');
    try { done(await api.importPaste({ owner: me, skill_md: paste, visibility })); }
    catch (e: any) { fail(e); }
  };

  return (
    <div style={{ paddingTop: 22 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage import</div>
      <h2>bring your skills <span className="blink grn">▊</span></h2>
      <div className="dim" style={{ marginBottom: 14 }}>
        Point at a folder with a SKILL.md, or paste one. Imports land as <b>{visibility}</b> repos — flip them public later.
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <span className="dim">New imports are</span>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="private">private</option>
          <option value="public">public</option>
        </select>
      </div>

      {msg && <div className="panel pad" style={{ marginBottom: 14 }}><span className={msg.ok ? 'grn' : 'amb'}>{msg.text}</span>
        {msg.ok && <span> — <Link to="/skills">open in Explore →</Link></span>}</div>}

      <div className="grid2">
        <div className="panel pad" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <div className="amb">$ import --path</div>
          <div className="dim" style={{ fontSize: 12 }}>
            A folder with a SKILL.md at its root. In Docker only paths under <code>IMPORT_ROOTS</code> are
            allowed (default <code>/data/imports</code>): mount the host folder there. In local dev, the
            default roots are <code>~/.claude/skills</code>, <code>~/.config/opencode/skills</code> and{' '}
            <code>~/.codex/skills</code>.
          </div>
          <input value={customPath} onChange={(e) => setCustomPath(e.target.value)} placeholder="~/.claude/skills/my-skill or /data/imports/my-skill" />
          <div><button disabled={!!busy} onClick={fromCustom}>{busy === 'folder' ? 'importing…' : '↓ import folder'}</button></div>
        </div>
        <div className="panel pad" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <div className="amb">$ import --paste</div>
          <div className="dim" style={{ fontSize: 12 }}>SKILL.md text with name + description in frontmatter.</div>
          <textarea rows={8} value={paste} onChange={(e) => setPaste(e.target.value)}
            placeholder={'---\nname: my-skill\ndescription: What it does\n---\n\n# My skill\n...'} style={{ fontFamily: 'inherit' }} />
          <div><button disabled={!!busy} onClick={fromPaste}>{busy === 'paste' ? 'importing…' : '↓ import pasted skill'}</button></div>
        </div>
      </div>
    </div>
  );
}
