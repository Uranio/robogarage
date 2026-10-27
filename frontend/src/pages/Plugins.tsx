import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';

type Agent = 'codex' | 'claude' | 'crush' | 'pi' | 'cursor' | 'gemini';

const AGENT_LABELS: Record<Agent, string> = {
  codex: 'Codex CLI',
  claude: 'Claude Code',
  crush: 'Crush / OpenCode',
  pi: 'Pi coding agent',
  cursor: 'Cursor',
  gemini: 'Gemini CLI',
};

export default function Plugins() {
  const me = useSession();
  const [agent, setAgent] = useState<Agent>('codex');
  const [tokens, setTokens] = useState<any[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScopes, setNewTokenScopes] = useState('repos:write,import:write');
  const [newTokenDays, setNewTokenDays] = useState('90');
  const [showingToken, setShowingToken] = useState<{ token: string; prefix: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!me) {
    return (
      <div style={{ paddingTop: 22, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div className="dim"><span className="prompt">➜</span> ~ robogarage plugin</div>
        <h2>Plugin RoboGarage</h2>
        <p className="dim">Effettua il login per configurare il plugin e collegare il tuo agent.</p>
        <div style={{ marginTop: 20 }}>
          <Link to="/login"><button className="amber">Effettua il login →</button></Link>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadTokens();
  }, [me]);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const data = await api.listTokens();
      setTokens(data);
    } catch (e: any) {
      setMsg(`✗ Impossibile caricare i token: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    if (!newTokenName.trim()) { setMsg('Inserisci un nome per il token'); return; }
    const days = Number(newTokenDays);
    if (!days || days < 1 || days > 3650) { setMsg('Giorni di scadenza non validi (1-3650)'); return; }
    setLoading(true);
    try {
      const data = await api.createToken({
        name: newTokenName.trim(),
        scopes: newTokenScopes.trim() || 'repos:write,import:write',
        expires_in_days: days,
      });
      setShowingToken({ token: data.token, prefix: data.prefix });
      setMsg('✓ Token creato. Copialo subito: non sarà più mostrato.');
      await loadTokens();
    } catch (e: any) {
      setMsg(`✗ Errore creazione token: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const revokeToken = async (id: number) => {
    setLoading(true);
    try {
      await api.revokeToken(id);
      setMsg('✓ Token revocato.');
      await loadTokens();
    } catch (e: any) {
      setMsg(`✗ Errore revoca: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: 22, maxWidth: 800, margin: '0 auto' }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage plugin install</div>
      <h2>RoboGarage Plugin — collega il tuo agent <span className="blink grn">▊</span></h2>

      <div className="panel pad" style={{ maxWidth: 760, display: 'grid', gap: 16, marginBottom: 20 }}>

        {/* Sezione token */}
        <div className="panel pad" style={{ display: 'grid', gap: 12 }}>
          <div className="row" style={{ alignItems: 'center', gap: 10 }}>
            <span className="grn" style={{ fontWeight: 700 }}>🔐 Token Personali (PAT)</span>
            <span className="grow" />
            <span className="dim" style={{ fontSize: 12 }}>
              I PAT ti permettono di usare il plugin senza inserire username/password ogni volta.
            </span>
          </div>

          {showingToken && (
            <div className="panel pad" style={{ background: '#0b0d10', borderColor: 'var(--grn)' }}>
              <div className="dim" style={{ fontSize: 12 }}>Il tuo token (mostrato una sola volta):</div>
              <div className="code" style={{ fontSize: 12, wordBreak: 'break-all' }}>{showingToken.token}</div>
              <div className="grn" style={{ fontSize: 12, marginTop: 6 }}>
                ✓ Copiato il prefisso: {showingToken.prefix}
              </div>
              <div>
                <button className="ghost" onClick={() => setShowingToken(null)} style={{ fontSize: 12, marginTop: 8 }}>
                  Ho copiato, nascondi
                </button>
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="Nome del token (es. render-deploy)"
              style={{ flex: 1, minWidth: 150 }}
            />
            <input
              value={newTokenDays}
              onChange={(e) => setNewTokenDays(e.target.value)}
              placeholder="90"
              style={{ width: 60 }}
            />
            <span className="dim" style={{ fontSize: 12 }}>giorni</span>
            <button className="amber" disabled={loading} onClick={createToken}>
              {loading ? 'Creando…' : '+ Crea token'}
            </button>
          </div>

          {msg && <div className={msg.startsWith('✓') ? 'grn' : 'amb'} style={{ fontSize: 13 }}>{msg}</div>}

          <div>
            <span className="dim" style={{ fontSize: 12 }}>Token esistenti:</span>
            {tokens.length === 0 ? (
              <div className="dim" style={{ fontSize: 12, fontStyle: 'italic' }}>Nessun token. Creane uno sopra.</div>
            ) : (
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--dim)', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '6px 0' }}>Nome</th>
                    <th style={{ padding: '6px 0' }}>Prefisso</th>
                    <th style={{ padding: '6px 0' }}>Scope</th>
                    <th style={{ padding: '6px 0' }}>Scadenza</th>
                    <th style={{ padding: '6px 0' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '6px 0', color: 'var(--txt)' }}>{t.name}</td>
                      <td style={{ padding: '6px 0', color: 'var(--grn)', fontFamily: 'monospace' }}>{t.prefix}</td>
                      <td style={{ padding: '6px 0', color: 'var(--dim)' }}>{t.scopes}</td>
                      <td style={{ padding: '6px 0', color: 'var(--dim)' }}>{t.expires_at || '—'}</td>
                      <td style={{ padding: '6px 0' }}>
                        <button className="ghost" onClick={() => revokeToken(t.id)} style={{ fontSize: 11, color: 'var(--amb)' }}>
                          Revoca
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sezione istruzioni agent */}
        <div className="panel pad" style={{ display: 'grid', gap: 14 }}>
          <div className="row" style={{ alignItems: 'center', gap: 10 }}>
            <span className="grn" style={{ fontWeight: 700 }}>🤖 Installa nel tuo agent</span>
            <span className="grow" />
          </div>

          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {['codex', 'claude', 'crush', 'pi', 'cursor', 'gemini'].map((a) => (
              <button
                key={a}
                className={agent === a ? 'amber' : 'ghost'}
                onClick={() => setAgent(a as Agent)}
                style={{ padding: '6px 12px', fontSize: 13, borderRadius: 6 }}
              >
                {AGENT_LABELS[a as Agent]}
              </button>
            ))}
          </div>

          <div className="panel pad" style={{ background: '#07090c', borderColor: 'var(--line)' }}>
            <div className="dim" style={{ fontSize: 12, marginBottom: 8 }}>Comandi da eseguire nel terminale:</div>
            <div className="code" style={{ fontSize: 12, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
              # 1. Installa il plugin
              git clone https://github.com/Uranio/robogarage-plugin.git
              cd robogarage-plugin
              npm install
              npm run build

              # 2. Configura il token (usa il PAT creato sopra)
              ./dist/index.js login --token &lt;IL_TUO_TOKEN&gt; --agent {agent}

              # 3. Usa i comandi
              ./dist/index.js list
              ./dist/index.js import owner/skill-name
              ./dist/index.js validate owner/skill --target {agent}
              ./dist/index.js publish ./mia-skill --visibility public --kind skill
            </div>

            {agent === 'codex' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <div className="dim" style={{ fontSize: 12 }}>Configurazione Codex aggiuntiva:</div>
                <div className="code" style={{ fontSize: 12 }}>
                  codex plugin marketplace add https://github.com/Uranio/robogarage-plugin
                  codex plugin install robogarage@robogarage-plugin
                  codex reload-plugins
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dim" style={{ fontSize: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          Progetto free di <b>Leonardo Martellini</b>. Vedi
          <Link to="/privacy">Privacy</Link> e
          <Link to="/terms">Termini</Link>.
        </div>
      </div>
    </div>
  );
}
