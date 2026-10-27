import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div style={{ paddingTop: 22, maxWidth: 700, lineHeight: 1.6 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage privacy</div>
      <h1>Privacy Policy — RoboGarage</h1>

      <p className="dim" style={{ fontSize: 13 }}><b>Ultimo aggiornamento:</b> 27 ottobre 2026</p>
      <p className="dim" style={{ fontSize: 13 }}><b>Progetto:</b> RoboGarage — progetto free di <b>Leonardo Martellini</b></p>

      <h2>1. Titolare del trattamento</h2>
      <p>RoboGarage è un progetto open source sviluppato da <b>Leonardo Martellini</b>. Il titolare del trattamento dei dati personali è il gestore dell'istanza su cui è deployata l'applicazione.</p>

      <h2>2. Dati raccolti</h2>
      <ul>
        <li><b>Dati di registrazione:</b> username, email (opzionale), password (hashata con scrypt, mai conservata in chiaro).</li>
        <li><b>Avatar:</b> immagine opzionale caricata dall'utente (max 2 MB).</li>
        <li><b>Skill e repository:</b> contenuti pubblici o privati caricati dall'utente (SKILL.md, AGENT.md, script, codice).</li>
        <li><b>Token di accesso (PAT):</b> hashati con scrypt, il valore in chiaro non viene mai memorizzato.</li>
        <li><b>Log tecnici:</b> indirizzo IP, user-agent, timestamp (usati solo per sicurezza e rate limiting).</li>
      </ul>

      <h2>3. Finalità del trattamento</h2>
      <ul>
        <li>Fornire l'accesso alla piattaforma RoboGarage (skill, agent, plugin).</li>
        <li>Consentire l'import, la pubblicazione e la validazione di skill.</li>
        <li>Autenticare e autorizzare l'accesso alle risorse (pubbliche e private).</li>
        <li>Prevenire abusi (rate limit, brute force).</li>
      </ul>

      <h2>4. Base giuridica</h2>
      <p>Il trattamento si basa sul <b>consenso dell'interessato</b> (art. 6, par. 1, lett. a GDPR) e sull'esecuzione di un contratto (art. 6, par. 1, lett. b GDPR) per l'erogazione del servizio.</p>

      <h2>5. Conservazione dei dati</h2>
      <p>I dati sono conservati per il tempo necessario all'erogazione del servizio. L'utente può richiedere la cancellazione del proprio account e dei dati associati in qualsiasi momento.</p>

      <h2>6. Diritti dell'interessato</h2>
      <p>Hai diritto di accedere, rettificare, cancellare, limitare il trattamento, portabilità dei dati e opposizione. Puoi esercitare tali diritti contattando il titolare all'indirizzo indicato nell'istanza RoboGarage che utilizzi.</p>

      <h2>7. Trasferimento dei dati</h2>
      <p>I dati restano all'interno dell'infrastruttura su cui è deployata l'istanza RoboGarage. Non sono trasferiti verso paesi terzi senza adeguate garanzie.</p>

      <h2>8. Cookie e tracciamento</h2>
      <p>RoboGarage non utilizza cookie di profilazione. Sono possibili cookie tecnici di sessione (JWT memorizzati localmente nel browser).</p>

      <h2>9. Modifiche alla presente informativa</h2>
      <p>La privacy policy può essere aggiornata. Le modifiche sono pubblicate in questa pagina con indicazione della data di ultimo aggiornamento.</p>

      <h2>10. Contatti</h2>
      <p>Per richieste relative alla privacy: contatta l'amministratore dell'istanza RoboGarage che stai utilizzando.</p>

      <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid var(--line)' }} />
      <p className="dim" style={{ fontSize: 12 }}>
        © 2026 Leonardo Martellini. Tutti i diritti riservati. RoboGarage è distribuito sotto licenza MIT.
      </p>
    </div>
  );
}
