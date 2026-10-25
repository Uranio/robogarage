import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';

export default function Skills() {
  const me = useSession();
  const [repos, setRepos] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [kindF, setKindF] = useState('all');
  const [err, setErr] = useState('');
  const shown = repos.filter((r) => kindF === 'all' || (r.kind || 'skill') === kindF);

  const load = async (query = '') => {
    try { setRepos(await api.repos(query)); } catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div style={{ paddingTop: 22 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage ls --sort recent</div>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h2 style={{ marginBottom: 0 }}>skills, agents &amp; plugins <span className="blink grn">▊</span></h2>
        <span className="grow" />
        <select value={kindF} onChange={(e) => setKindF(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="all">all kinds</option>
          <option value="skill">skills</option>
          <option value="agent">agents</option>
          <option value="plugin">plugins</option>
        </select>
      </div>

      <div className="panel pad row" style={{ marginBottom: 14 }}>
        <span className="prompt">$</span>
        <input className="grow" placeholder="Search name, description, owner…" value={q}
          onChange={(e) => { setQ(e.target.value); load(e.target.value); }} style={{ maxWidth: 420 }} />
        {me ? (
          <Link to="/new"><button className="amber">+ new skill</button></Link>
        ) : (
          <Link to="/register"><button className="amber">Sign up to create →</button></Link>
        )}
        {err && <span className="amb">{err} — start the backend on :8901</span>}
      </div>

      <div className="panel">
        <table>
          <thead><tr><th>repo</th><th>desc</th><th>★</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/r/${r.id}`}>{r.owner}/{r.name}</Link>{(r.kind || 'skill') !== 'skill' ? <span className="badge" style={{ marginLeft: 8 }}>{r.kind}</span> : null}{r.forked_from_id ? <span className="badge fork" style={{ marginLeft: 8 }}>fork</span> : null}</td>
                <td className="dim">{r.description?.slice(0, 60)}</td>
                <td className="amb">{r.stars}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={3} className="dim">Nothing here yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
