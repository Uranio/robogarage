import { useState } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  { id: 'intro', title: 'Introduzione' },
  { id: 'quickstart', title: 'Guida rapida' },
  { id: 'account', title: 'Account e autenticazione' },
  { id: 'repos', title: 'Creare una skill/repo' },
  { id: 'import', title: 'Importare una skill' },
  { id: 'publish', title: 'Pubblicare una skill' },
  { id: 'validate', title: 'Validare una skill' },
  { id: 'marketplace', title: 'Marketplace e installazione' },
  { id: 'agents', title: 'Collegare il tuo agent' },
  { id: 'tokens', title: 'Personal Access Token (PAT)' },
  { id: 'legal', title: 'Privacy e termini' },
];

export default function Docs() {
  const [active, setActive] = useState('intro');

  const section = (() => {
    switch (active) {
      case 'intro':
        return (
          <>
            <h2>Introduzione</h2>
            <p>
              <b>RoboGarage</b> è una piattaforma per ospitare, condividere e installare
              <b>skill, agent e plugin</b> per sistemi di intelligenza artificiale
              (Codex CLI, Claude Code, Crush/OpenCode, Pi, Cursor, Gemini).
            </p>
            <p>
              Ogni skill è un vero repository Git con un file
              <code>SKILL.md</code> (standard Agent Skills), indice di ricerca,
              fork, stelle, membri e pull request.
            </p>
            <div className="panel pad" style={{ marginTop: 16 }}>
              <h3>Cosa puoi fare</h3>
              <ul style={{ lineHeight: '1.8' }}>
                <li>Creare skill, agent o plugin e ospitarli su RoboGarage</li>
                <li>Importare skill da cartelle locali o incollando il testo</li>
                <li>Pubblicare skill pubbliche o private</li>
                <li>Validare skill tramite l'API di RoboGarage</li>
                <li>Installare skill nei tuoi agent tramite il plugin ufficiale</li>
                <li>Forkare, mettere stelle e collaborare su skill altrui</li>
              </ul>
            </div>
          </>
        );
      case 'quickstart':
        return (
          <>
            <h2>Guida rapida</h2>
            <ol style={{ lineHeight: '1.8' }}>
              <li>
                <b>Registrati</b> su <Link to="/register">RoboGarage</o> oppure effettua il
                <Link to="/login">login</Link>.
              </li>
              <li>
                Crea una nuova skill da <Link to="/new">"+ new skill"</Link> oppure importa
                una skill esistente da <Link to="/import">"import"</Link>.
              </li>
              <li>
                Collega il tuo agent (Codex, Claude Code, ecc.) tramite il
                <Link to="/plugins">plugin RoboGarage</Link> e un Personal Access Token.
              </li>
              <li>
                Usa i comandi <code>robogarage list</code>, <code>import</code>,
                <code>validate</code> e <code>publish</code> per gestire le tue skill.
              </li>
            </ol>
          </>
        );
      case 'account':
        return (
          <>
            <h2>Account e autenticazione</h2>
            <p>
              Puoi registrarti con username, email (opzionale) e password. La password
              viene hashata con <b>scrypt</b> e mai conservata in chiaro.
            </p>
            <div className="panel pad" style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <div><b>Login:</b> <Link to="/login">/login</Link> — accedi con username o email e password.</div>
              <div><b>Registrazione:</b> <Link to="/register">/register</Link> — crea un nuovo account.</div>
              <div><b>Recupero password:</b> <Link to="/recover">/recover</Link> — invia un link di reset valido 30 minuti.</div>
              <div><b>Avatar:</b> puoi caricare un'immagine profilo (max 2 MB) o usare un colore di fallback.</div>
            </div>
          </>
        );
      case 'repos':
        return (
          <>
            <h2>Creare una skill / repo</h2>
            <p>
              Vai su <Link to="/new">"+ new skill"</Link>. Devi scegliere:
            </p>
            <ul style={{ lineHeight: '1.8' }}>
              <li><b>Nome:</b> 2-60 caratteri, lowercase, numeri e trattini (es. <code>web-scraper</code>).</li>
              <li><b>Descrizione:</b> testo breve che descrive cosa fa la skill.</li>
              <li><b>Tipo:</b> <i>skill</i> (SKILL.md + script), <i>agent</i> (AGENT.md) o <i>plugin</i> (bundle multi-tool).</li>
              <li><b>Plugin target (solo per plugin):</b> claude, opencode, codex, cursor o gemini.</li>
              <li><b>Visibilità:</b> <i>public</i> (visibile a tutti, nel marketplace) o <i>private</i> (solo te e i collaboratori).</li>
            </ul>
            <p>
              Alla creazione, RoboGarage inizializza un repository Git con lo
              <b>scaffold standard</b> (SKILL.md, README, CHANGELOG, references, examples, scripts, tests, skill.json).
            </p>
          </>
        );
      case 'import':
        return (
          <>
            <h2>Importare una skill</h2>
            <p>
              Vai su <Link to="/import">"import"</Link>. Hai due modalità:
            </p>
            <h3>1. Da cartella locale</h3>
            <p>
              Specifica un percorso assoluto contenente un file <code>SKILL.md</code> nella
              root (es. <code>~/.claude/skills/mia-skill</code> o <code>/data/imports/mia-skill</code>).
              RoboGarage copia i file, salta <code>.git</code>, <code>node_modules</code>,
              <code>dist</code>, <code>build</code> e i link simbolici.
            </p>
            <h3>2. Incollando il testo SKILL.md</h3>
            <p>
              Incolla il contenuto completo di un file <code>SKILL.md</code> con frontmatter
              (campi <code>name</code> e <code>description</code> obbligatori).
            </p>
            <p className="dim" style={{ fontSize: 12 }}>
              Le importazioni sono private di default. Puoi renderle pubbliche in seguito dalle impostazioni del repo.
            </p>
          </>
        );
      case 'publish':
        return (
          <>
            <h2>Pubblicare una skill</h2>
            <p>
              Usa l'interfaccia di RoboGarage o il plugin CLI:
            </p>
            <div className="code" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
              # Crea una skill locale
              robogarage init mia-skill --kind skill
              # Pubblicala su RoboGarage (viene validata automaticamente)
              robogarage publish ./mia-skill --visibility public --kind skill
            </div>
            <p>
              La pubblicazione include automaticamente una <b>validazione</b> della skill
              tramite l'endpoint <code>POST /api/repos/:id/validate</code>. Se ci sono errori,
              vieni avvisato ma l'importazione prosegue comunque.
            </p>
          </>
        );
      case 'validate':
        return (
          <>
            <h2>Validare una skill</h2>
            <p>
              La validazione controlla che la skill rispetti lo standard Agent Skills:
              frontmatter valido, file referenziati esistenti, cross-link coerenti e
              regole del target scelto (claude, opencode, codex, cursor, gemini).
            </p>
            <div className="code" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
              robogarage validate owner/skill-name --target claude
            </div>
            <p>
              Puoi anche validare dalla pagina del repository, scheda <b>"check"</b>.
              Il risultato mostra errori (bloccanti) e avvertenze (consigli).
            </p>
          </>
        );
      case 'marketplace':
        return (
          <>
            <h2>Marketplace e installazione</h2>
            <p>
              Le skill <b>pubbliche</b> che superano la validazione con zero errori
              vengono inserite nel <b>marketplace JSON</b> di RoboGarage:
            </p>
            <div className="code" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
              GET /api/marketplace.json
            </div>
            <p>
              Il marketplace è compatibile con l'installazione one-click di Claude Code
              e altri agent che supportano lo standard Agent Skills.
            </p>
          </>
        );
      case 'agents':
        return (
          <>
            <h2>Collegare il tuo agent</h2>
            <p>
              RoboGarage fornisce un plugin CLI ufficiale che installa skill nello
              standard Agent Skills nelle directory corrette per ogni agent:
            </p>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--dim)', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '6px 0' }}>Agent</th>
                  <th style={{ padding: '6px 0' }}>Directory skill</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--txt)' }}>Codex CLI</td>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>~/.codex/skills/&lt;nome&gt;/SKILL.md</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--txt)' }}>Claude Code</td>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>~/.claude/skills/&lt;nome&gt;/SKILL.md</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--txt)' }}>Crush / OpenCode</td>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>~/.config/crush/skills/&lt;nome&gt;/SKILL.md</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--txt)' }}>Pi coding agent</td>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>~/.agents/skills/&lt;nome&gt;/SKILL.md</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--txt)' }}>Cursor</td>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>~/.cursor/skills/&lt;nome&gt;/SKILL.md</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--txt)' }}>Gemini CLI</td>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>~/.gemini/skills/&lt;nome&gt;/SKILL.md</td>
                </tr>
              </tbody>
            </table>
            <p className="dim" style={{ marginTop: 10, fontSize: 12 }}>
              Installa il plugin: <code>git clone https://github.com/Uranio/robogarage-plugin</code>, poi
              <code>robogarage login --token &lt;PAT&gt; --agent &lt;codex|claude|crush|pi|cursor|gemini&gt;</code>.
            </p>
          </>
        );
      case 'tokens':
        return (
          <>
            <h2>Personal Access Token (PAT)</h2>
            <p>
              I PAT permettono di usare il plugin CLI e le API di RoboGarage senza
              inserire username e password ogni volta. Vanno creati dalla pagina
              <Link to="/plugins">Plugin</a> dopo il login.
            </p>
            <ul style={{ lineHeight: '1.8' }}>
              <li>Il valore in chiaro viene mostrato <b>una sola volta</b> alla creazione.</li>
              <li>Sul server il token è <b>hashato con scrypt</b>, mai memorizzato in chiaro.</li>
              <li>Ogni token ha uno <b>scope</b> (default: <code>repos:write,import:write</code>).</li>
              <li>Può avere una <b>scadenza</b> (1-3650 giorni).</li>
              <li>Può essere <b>revocato</b> in qualsiasi momento.</li>
              <li>Max 20 token attivi per utente.</li>
            </ul>
            <p className="amb" style={{ fontSize: 12 }}>
              ⚠️ Copia subito il token: dopo la creazione non è più leggibile.
            </p>
          </>
        );
      case 'legal':
        return (
          <>
            <h2>Privacy e termini</h2>
            <p>
              RoboGarage è un progetto <b>gratuito (free)</b> di
              <b>Leonardo Martellini</b>, distribuito sotto licenza <b>MIT</b>.
            </p>
            <div className="panel pad" style={{ marginTop: 12, display: 'grid', gap: 10, fontSize: 13 }}>
              <div><Link to="/privacy"><b>Privacy Policy</b></Link> — GDPR, dati raccolti, diritti dell'utente, sicurezza.</div>
              <div><Link to="/terms"><b>Termini di Servizio</b></Link> — declino di responsabilità, proprietà intellettuale, legge applicabile.</div>
              <div><b>Licenza codice:</b> MIT — vedi file <code>LICENSE</code> nel repository.</div>
              <div><b>Contenuti utenti:</b> restano di proprietà dei rispettivi autori.</div>
            </div>
          </>
        );
      default:
        return <div>Sezione non trovata</div>;
    }
  })();

  return (
    <div style={{ paddingTop: 22, maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
      {/* Sidebar */}
      <aside style={{ position: 'sticky', top: 20 }}>
        <div className="dim" style={{ fontSize: 11, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Documentazione
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={active === s.id ? 'amber' : 'ghost'}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                borderRadius: 6px,
                fontSize: 13,
                border: 'none',
                background: active === s.id ? 'rgba(51,255,102,.06)' : 'transparent',
                color: active === s.id ? 'var(--grn)' : 'var(--dim)',
                cursor: 'pointer',
              }}
            >
              {s.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main>
        {section}
        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid var(--line)' }} />
        <p className="dim" style={{ fontSize: 12 }}>
          Progetto free di <b>Leonardo Martellini</b>. Vedi
          <Link to="/privacy">Privacy</Link> e
          <Link to="/terms">Termini</Link>.
        </p>
      </main>
    </div>
  );
}
