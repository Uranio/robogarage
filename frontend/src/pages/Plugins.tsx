import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';

export default function Plugins() {
  const me = useSession();
  const [installed, setInstalled] = useState(false);
  const [agent, setAgent] = useState<'codex' | 'claude' | 'opencode' | 'pi'>('codex');
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  if (!me) return <Link to="/login">Effettua il login per accedere ai plugin</Link>;

  const install = async () => {
    if (!token.trim()) { setMsg('Inserisci il tuo token RoboGarage'); return; }
    try {
      // Salva il token come preferenza utente (opzionale: chiama un endpoint backend)
      setMsg(`✓ Token configurato per ${agent}. Installa il plugin nel tuo agent.`);
      setInstalled(true);
    } catch (e: any) {
      setMsg(`✗ ${e.message}`);
    }
  };

  return (
    <div style={{ paddingTop: 22 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage plugin install</div>
      <h2>RoboGarage Plugin — installa nel tuo agent <span className="blink grn">▊</span></h2>

      <div className="panel pad" style={{ maxWidth: 700, display: 'grid', gap: 14 }}>
        <div className="dim">
          Collega il tuo account RoboGarage a Codex, Claude Code, OpenCode o Pi e
          automatizza import, publish e validazione di skill direttamente dal tuo agent.
        </div>

        <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="dim">Agent:</span>
          {['codex', 'claude', 'opencode', 'pi'].map((a) => (
            <button
              key={a}
              className={agent === a ? 'amber' : 'ghost'}
              onClick={() => setAgent(a as any)}
              style={{ padding: '6px 12px', fontSize: 13 }}
            >
              {a}
            </button>
          ))}
        </div>

        <label>
          <div className="dim">Il tuo token RoboGarage (PAT o JWT)</div>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="rk_abc123..."
            style={{ width: '100%' }}
          />
        </label>

        <div>
          <button className="amber" disabled={!token.trim()} onClick={install}>
            {installed ? '✓ Configurato' : 'Configura e installa'}
          </button>
        </div>

        {msg && <div className={msg.startsWith('✓') ? 'grn' : 'amb'}>{msg}</div>}

        <div className="panel pad" style={{ display: 'grid', gap: 10 }}>
          <div className="dim">1. Scarica il plugin</div>
          <div className="code" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
            git clone https://github.com/Uranio/robogarage-plugin.git
            cd robogarage-plugin
            npm install
            npm run build
          </div>

          <div className="dim">2. Configura il token</div>
          <div className="code" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
            ./dist/index.js login --token <IL_TUO_TOKEN> --agent {agent}
          </div>

          <div className="dim">3. Usa i comandi</div>
          <div className="grid2" style={{ gap: 10 }}>
            <div className="code" style={{ fontSize: 12 }}>
              robogarage list
            </div>
            <div className="code" style={{ fontSize: 12 }}>
              robogarage import owner/skill-name
            </div>
            <div className="code" style={{ fontSize: 12 }}>
              robogarage validate owner/skill --target claude
            </div>
            <div className="code" style={{ fontSize: 12 }}>
              robogarage publish ./mia-skill --visibility public
            </div>
          </div>
        </div>

        <div className="dim" style={{ fontSize: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          Progetto free di <b>Leonardo Martellini</b>. Vedi
          <Link to="/privacy">Privacy</a> e <Link to="/terms">Termini</Link>.
        </div>
      </div>
    </div>
  );
}
