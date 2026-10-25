import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';

const DEFAULT_TOOLS = [
  { id: 'claude', label: 'Claude Code', dir: '~/.claude/skills', glyph: '✳', color: '#D97757' },
  { id: 'opencode', label: 'OpenCode', dir: '~/.config/opencode/skills', glyph: '❯', color: '#9AA4B2' },
  { id: 'codex', label: 'Codex CLI', dir: '~/.codex/skills', glyph: '◈', color: '#10A37C' },
];

export default function RepoDetail() {
  const me = useSession();
  const { id } = useParams();
  const rid = Number(id);
  const [repo, setRepo] = useState<any>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [ref, setRef] = useState('main');
  const [path, setPath] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [blob, setBlob] = useState('');
  const [sel, setSel] = useState('SKILL.md');
  const [commits, setCommits] = useState<any[]>([]);
  const [pulls, setPulls] = useState<any[]>([]);
  const [tab, setTab] = useState<'files' | 'commits' | 'pulls' | 'check' | 'edit' | 'get'>('files');
  const [edit, setEdit] = useState({ message: '', content: '' });
  const [newBranch, setNewBranch] = useState('');
  const [pr, setPr] = useState({ title: '', head_branch: '', base_branch: 'main' });
  const [msg, setMsg] = useState('');
  const [diffs, setDiffs] = useState<Record<number, any>>({});
  const [diffOpen, setDiffOpen] = useState<Record<number, boolean>>({});
  const [target, setTarget] = useState('');
  const [report, setReport] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [tools, setTools] = useState<Array<{ id: string; label: string; dir: string; glyph: string; color: string; agentDir?: string | null; pluginHint?: string | null }>>(DEFAULT_TOOLS);

  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const installUrl = `http://${host}:8901${api.archiveUrl(rid, ref)}`;
  const rawUrl = `http://${host}:8901/api/repos/${rid}/raw?ref=${encodeURIComponent(ref)}&path=SKILL.md`;
  const rawAgentUrl = `http://${host}:8901/api/repos/${rid}/raw?ref=${encodeURIComponent(ref)}&path=AGENT.md`;

  const load = async () => {
    const r = await api.repo(rid);
    setRepo(r); setRef((old) => old || r.default_branch);
    setBranches((await api.branches(rid)).branches);
    setCommits(await api.commits(rid, ref).catch(() => []));
    setPulls(await api.pulls(rid).catch(() => []));
    const t = await api.tree(rid, ref, path).catch(() => ({ entries: [] }));
    setEntries(t.entries);
    if (sel) setBlob((await api.blob(rid, ref, sel).catch(() => ({ content: '' }))).content);
  };

  useEffect(() => { load(); api.tools().then(setTools).catch(() => {}); /* eslint-disable-next-line */ }, [rid]);
  useEffect(() => { api.tree(rid, ref, path).then((t) => setEntries(t.entries)).catch(() => {}); /* eslint-disable-next-line */ }, [ref, path]);
  useEffect(() => { api.commits(rid, ref).then(setCommits).catch(() => setCommits([])); }, [rid, ref]);

  const openBlob = async (p: string) => {
    setSel(p);
    const b = await api.blob(rid, ref, p).catch(() => ({ content: '(binary or missing)' }));
    setBlob(b.content);
    setEdit({ message: `update ${p}`, content: b.content });
  };

  const save = async () => {
    setMsg('');
    try {
      const r = await api.commit(rid, { branch: ref, message: edit.message || `update ${sel}`, author: repo.owner, files: { [sel]: edit.content } });
      setMsg(`✓ committed ${r.hash} on ${ref}`);
      setBlob(edit.content); load();
    } catch (e: any) { setMsg('✗ ' + e.message); }
  };

  if (!repo) return <div className="pad dim" style={{ paddingTop: 30 }}>$ loading…</div>;

  return (
    <div style={{ paddingTop: 20 }}>
      <div className="dim"><span className="prompt">➜</span> ~/skills/{repo.owner}/{repo.name} — <span className="grn">{ref}</span></div>
      <div className="row" style={{ margin: '8px 0 14px' }}>
        <h2 style={{ margin: 0 }}>{repo.owner}/<span className="grn">{repo.name}</span></h2>
        {repo.forked_from_id && <span className="badge fork">fork of #{repo.forked_from_id}</span>}
        {repo.visibility === 'private' && <span className="badge fork">[private]</span>}
        {(repo.kind || 'skill') !== 'skill' && (
          <span className="badge">{repo.kind}{repo.kind === 'plugin' && repo.plugin_target ? `:${repo.plugin_target}` : ''}</span>
        )}
        <span className="badge">★ {repo.stars}</span>
        <span className="grow" />
        {me === repo.owner && (
          <select value={repo.visibility || 'public'}
            onChange={async (e) => { await api.updateRepo(rid, { visibility: e.target.value }); load(); }}
            style={{ maxWidth: 130 }} title="Visibility">
            <option value="public">public</option>
            <option value="private">private</option>
          </select>
        )}
        <button className="ghost" onClick={() => api.star(rid).then(load)}>★ star</button>
        {me ? (
          <button className="ghost" onClick={async () => {
            try { const f = await api.fork(rid); setMsg(`✓ forked to ${f.owner}/${f.name} — find it in ~/skills`); }
            catch (e: any) { setMsg('✗ ' + e.message); }
          }}>⑂ fork to my account</button>
        ) : (
          <Link to="/login" className="dim" style={{ fontSize: 12 }}>sign in to fork</Link>
        )}
      </div>
      <div className="dim" style={{ marginBottom: 12 }}>{repo.description}</div>

      <div className="row" style={{ marginBottom: 12 }}>
        {( ['files', 'commits', 'pulls', 'check', 'edit', 'get'] as const).map((t) => (
          <button key={t} className={tab === t ? '' : 'ghost'} onClick={() => setTab(t)}>$ {t}</button>
        ))}
        <span className="grow" />
        <select value={ref} onChange={(e) => setRef(e.target.value)} style={{ maxWidth: 170 }}>
          {branches.map((b) => <option key={b} value={b}>⎇ {b}</option>)}
        </select>
        <input placeholder="new branch name…" value={newBranch} onChange={(e) => setNewBranch(e.target.value)} style={{ maxWidth: 190 }} />
        <button className="ghost" onClick={async () => { await api.createBranch(rid, { name: newBranch, from: ref }); setBranches([...branches, newBranch]); setRef(newBranch); setNewBranch(''); }}>+ branch</button>
      </div>

      {msg && <div className="panel pad" style={{ marginBottom: 12 }}><span className="grn">{msg}</span></div>}

      {tab === 'files' && (
        <div className="grid2">
          <div className="panel pad filetree">
            <div className="dim">$ list {ref}:{path || '.'}</div>
            {path && <button onClick={() => setPath(path.split('/').slice(0, -1).join('/'))}>↩ ..</button>}
            {entries.map((e) => (
              <button key={e.path} onClick={() => e.type === 'tree' ? setPath(e.path) : openBlob(e.path)}>
                {e.type === 'tree' ? '▸' : '·'} {e.name}
              </button>
            ))}
            <div className="dim" style={{ marginTop: 10, fontSize: 12 }}>members: {(repo.collaborators || []).map((c: any) => `${c.username}(${c.role})`).join(', ') || '—'}</div>
          </div>
          <div className="panel pad">
            <div className="dim">$ show {ref}:{sel}</div>
            <div className="code" style={{ marginTop: 8 }}>{blob || '(pick a file)'}</div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="ghost" onClick={() => { setEdit({ message: `update ${sel}`, content: blob }); setTab('edit'); }}>✎ edit</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'commits' && (
        <div className="panel"><table>
          <thead><tr><th>hash</th><th>msg</th><th>author</th><th>date</th></tr></thead>
          <tbody>{commits.map((c) => (
            <tr key={c.hash}><td className="amb">{c.hash?.slice(0, 7)}</td><td>{c.message}</td><td className="grn">{c.author}</td><td className="dim">{c.date}</td></tr>
          ))}</tbody>
        </table></div>
      )}

      {tab === 'pulls' && (
        <div className="panel pad" style={{ display: 'grid', gap: 10 }}>
          <div className="row">
            <input placeholder="PR title" value={pr.title} onChange={(e) => setPr({ ...pr, title: e.target.value })} style={{ maxWidth: 260 }} />
            <input placeholder="head branch" value={pr.head_branch} onChange={(e) => setPr({ ...pr, head_branch: e.target.value })} style={{ maxWidth: 160 }} />
            <span className="dim">→</span>
            <input placeholder="base" value={pr.base_branch} onChange={(e) => setPr({ ...pr, base_branch: e.target.value })} style={{ maxWidth: 120 }} />
            <button onClick={async () => { await api.createPull({ repo_id: rid, head_repo_id: rid, author: repo.owner, ...pr }); setPr({ title: '', head_branch: '', base_branch: 'main' }); setPulls(await api.pulls(rid)); }}>+ open PR</button>
          </div>
          {pulls.map((p) => (
            <div key={p.id}>
              <div className="row panel pad">
                <span className={p.status === 'open' ? 'grn' : 'dim'}>#{p.id} [{p.status}]</span>
                <b>{p.title}</b>
                <span className="dim">{p.head_branch} → {p.base_branch}</span>
                <span className="grow" />
                <button className="ghost" onClick={async () => {
                  const open = !diffOpen[p.id];
                  setDiffOpen({ ...diffOpen, [p.id]: open });
                  if (open && !diffs[p.id]) {
                    try { setDiffs({ ...diffs, [p.id]: await api.pullDiff(p.id) }); }
                    catch (e: any) { setDiffs({ ...diffs, [p.id]: { diff: '', stat: '', error: e.message } }); }
                  }
                }}>{diffOpen[p.id] ? 'hide diff' : '$ diff'}</button>
                {p.status === 'open' && <button className="amber" onClick={async () => { try { await api.mergePull(p.id); setMsg(`✓ PR #${p.id} merged`); } catch (e: any) { setMsg('✗ ' + e.message); } setPulls(await api.pulls(rid)); }}>merge</button>}
              </div>
              {diffOpen[p.id] && <DiffBlock data={diffs[p.id]} />}
            </div>
          ))}
          {pulls.length === 0 && <div className="dim">No pull requests — create a branch, commit, then open one into main.</div>}
        </div>
      )}

      {tab === 'get' && (repo.kind || 'skill') === 'skill' && (
        <div className="panel pad" style={{ display: 'grid', gap: 12 }}>
          <div className="dim">$ terminal — clone it like a repo:</div>
          {tools.map((t) => (
            <CmdRow key={'t' + t.id} glyph={t.glyph} color={t.color} label={t.label}
              cmd={`curl -s "${installUrl}" | tar -xz -C ${t.dir}/`} />
          ))}
          <div className="dim" style={{ marginTop: 6 }}>$ chat — paste inside the tool, hit enter:</div>
          {tools.map((t) => (
            <CmdRow key={'c' + t.id} glyph={t.glyph} color={t.color} label={t.label}
              cmd={`Fetch ${rawUrl} and save it as ${t.dir}/${repo.name}/SKILL.md, then confirm it loads.`} />
          ))}
          <div className="dim" style={{ fontSize: 12 }}>
            Both carry the <span className="grn">{ref}</span> branch.
            {repo.visibility === 'private' && ' Private skills install fine on this machine; from elsewhere they need access first.'}
          </div>
        </div>
      )}

      {tab === 'get' && (repo.kind || 'skill') === 'agent' && (
        <div className="panel pad" style={{ display: 'grid', gap: 12 }}>
          <div className="dim">$ terminal — drop AGENT.md into the tool:</div>
          {tools.filter((t) => t.agentDir).map((t) => (
            <CmdRow key={'t' + t.id} glyph={t.glyph} color={t.color} label={t.label}
              cmd={`mkdir -p ${t.agentDir} && curl -s "${rawAgentUrl}" -o ${t.agentDir}/${repo.name}.md`} />
          ))}
          <div className="dim" style={{ marginTop: 6 }}>$ chat — paste inside the tool, hit enter:</div>
          {tools.filter((t) => t.agentDir).map((t) => (
            <CmdRow key={'c' + t.id} glyph={t.glyph} color={t.color} label={t.label}
              cmd={`Fetch ${rawAgentUrl} and save it as ${t.agentDir}/${repo.name}.md, then confirm it loads.`} />
          ))}
          <div className="dim" style={{ fontSize: 12 }}>Canonical AGENT.md loads in Claude and OpenCode; other tools read the same file best-effort.</div>
        </div>
      )}

      {tab === 'get' && repo.kind === 'plugin' && (
        <div className="panel pad" style={{ display: 'grid', gap: 12 }}>
          <div className="dim">$ marketplace — one command for Claude users:</div>
          <CmdRow glyph="★" color="var(--amb)" label="marketplace"
            cmd={`claude plugin marketplace add http://${host}:8901/api/marketplace.json`} />
          <div className="dim">$ …or download the bundle, then follow your tool's way:</div>
          <CmdRow glyph="↓" color="var(--amb)" label="archive"
            cmd={`curl -s "${installUrl}" -o ${repo.name}.tar.gz && tar -xzf ${repo.name}.tar.gz`} />
          {tools.filter((t) => t.pluginHint).map((t) => (
            <div className="row" key={t.id}>
              <span style={{ color: t.color }}>{t.glyph}</span>
              <span className="grn" style={{ minWidth: 150 }}>{t.label}</span>
              <span className="dim grow" style={{ fontSize: 13 }}>{t.pluginHint!.replace('<folder>', `${repo.name}/`)}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'check' && (
        <div className="panel pad" style={{ display: 'grid', gap: 10 }}>
          <div className="row">
            <span className="dim">$ validate {(repo.kind || 'skill')}{repo.kind === 'plugin' ? ` → ${target || repo.plugin_target || 'generic'}` : ''} @ {ref}</span>
            <span className="grow" />
            {repo.kind === 'plugin' && (
              <select value={target || repo.plugin_target || 'claude'} onChange={(e) => setTarget(e.target.value)} style={{ maxWidth: 150 }}>
                <option value="claude">Claude Code</option>
                <option value="opencode">OpenCode</option>
                <option value="codex">Codex</option>
                <option value="cursor">Cursor</option>
                <option value="gemini">Gemini CLI</option>
              </select>
            )}
            <button disabled={checking} onClick={async () => {
              setChecking(true);
              try { setReport(await api.validate(rid, { ref, target: target || undefined })); }
              catch (e: any) { setReport({ ok: false, errors: [{ path: '', message: e.message }], warnings: [] }); }
              finally { setChecking(false); }
            }}>{checking ? 'checking…' : '$ run'}</button>
          </div>
          {report && (
            <div>
              <div className={report.ok ? 'grn' : 'amb'} style={{ marginBottom: 8 }}>
                {report.ok
                  ? `✓ valid ${report.kind} (${report.files} file${report.files === 1 ? '' : 's'})`
                  : `✗ ${report.errors?.length || 0} error(s), ${report.warnings?.length || 0} warning(s)`}
              </div>
              {(report.errors || []).map((e: any, i: number) => (
                <div key={'e' + i} className="amb" style={{ fontSize: 13 }}>✗ {e.path ? <code>{e.path}</code> : null}{e.path ? ' — ' : ''}{e.message}</div>
              ))}
              {(report.warnings || []).map((w: any, i: number) => (
                <div key={'w' + i} className="dim" style={{ fontSize: 13 }}>! {w.path ? <code>{w.path}</code> : null}{w.path ? ' — ' : ''}{w.message}</div>
              ))}
              {report.truncated && <div className="dim" style={{ fontSize: 12 }}>Large repo — checked the first files only.</div>}
              {repo.kind === 'plugin' && (
                <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>
                  Marketplace: {repo.visibility === 'public' && report.ok && (repo.plugin_target || 'claude') === 'claude'
                    ? <span className="grn">listed ✓ — see install in $ get</span>
                    : <span className="amb">not listed ({repo.visibility !== 'public'
                      ? 'private'
                      : report.ok ? `target ${repo.plugin_target || 'claude'} is not served` : 'fix the errors above'})</span>}
                </div>
              )}
            </div>
          )}
          {!report && <div className="dim" style={{ fontSize: 13 }}>Runs our validator: manifest, frontmatter, components, cross-links.</div>}
        </div>
      )}

      {tab === 'edit' && (
        <div className="panel pad" style={{ display: 'grid', gap: 10 }}>
          <div className="dim">$ edit {sel} <span className="dim">(branch: {ref})</span></div>
          <input placeholder="commit message" value={edit.message} onChange={(e) => setEdit({ ...edit, message: e.target.value })} />
          <textarea rows={18} value={edit.content} onChange={(e) => setEdit({ ...edit, content: e.target.value })} style={{ fontFamily: 'inherit' }} />
          <div><button className="amber" onClick={save}>$ commit -m</button></div>
        </div>
      )}
    </div>
  );
}

function DiffBlock({ data }: { data: any }) {
  if (!data) return <div className="code dim" style={{ fontSize: 12 }}>loading…</div>;
  if (data.error) return <div className="code amb" style={{ fontSize: 12 }}>✗ {data.error}</div>;
  if (!data.diff?.trim()) return <div className="code dim" style={{ fontSize: 12 }}>no changes — branches are identical</div>;
  return (
    <div className="code" style={{ fontSize: 12, marginTop: 8 }}>
      {data.stat ? <div className="dim">{data.stat}</div> : null}
      {data.diff.split('\n').map((l: string, i: number) => (
        <div
          key={i}
          className={
            l.startsWith('+') && !l.startsWith('+++') ? 'grn'
            : l.startsWith('-') && !l.startsWith('---') ? 'amb'
            : l.startsWith('@') || l.startsWith('diff') ? 'amb' : 'dim'
          }
        >
          {l || ' '}
        </div>
      ))}
      {data.truncated ? <div className="dim">…truncated, showing the first lines</div> : null}
    </div>
  );
}

function CmdRow({ glyph, color, label, cmd }: { glyph: string; color: string; label: string; cmd: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = cmd;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        <span style={{ color }}>{glyph}</span>
        <span className="grn">{label}</span>
      </div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <code className="grow" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{cmd}</code>
        <button className="ghost" title="Copy to clipboard" onClick={copy} style={{ padding: '8px 12px' }}>{copied ? '✓' : '⧉'}</button>
      </div>
    </div>
  );
}
