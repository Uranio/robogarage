import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div style={{ paddingTop: 22, maxWidth: 700, lineHeight: 1.6 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage terms</div>
      <h1>Termini di Servizio — RoboGarage</h1>

      <p className="dim" style={{ fontSize: 13 }}><b>Ultimo aggiornamento:</b> 27 ottobre 2026</p>
      <p className="dim" style={{ fontSize: 13 }}><b>Progetto:</b> RoboGarage — progetto free di <b>Leonardo Martellini</b></p>

      <h2>1. Accettazione dei termini</h2>
      <p>Accedendo o utilizzando RoboGarage accetti questi Termini di Servizio. Se non accetti, non utilizzare il servizio.</p>

      <h2>2. Descrizione del servizio</h2>
      <p>RoboGarage è una piattaforma per la gestione, condivisione e installazione di skill, agent e plugin per sistemi di intelligenza artificiale (Codex, Claude Code, OpenCode, Pi e altri). Il servizio è fornito in modalità <b>gratuita (free)</b>.</p>

      <h2>3. Account utente</h2>
      <p>Puoi creare un account con username e password. Sei responsabile della riservatezza delle tue credenziali e di tutte le attività effettuate con il tuo account.</p>

      <h2>4. Contenuti degli utenti</h2>
      <p>I contenuti caricati (skill, repository, commenti) restano di proprietà dell'autore. Caricando contenuti su RoboGarage concedi alla piattaforma la licenza non esclusiva di ospitarli, visualizzarli e distribuirli all'interno del servizio.</p>

      <h2>5. Validazione di skill e plugin</h2>
      <p>RoboGarage offre una funzione di validazione automatica di skill e plugin. La validazione è effettuata su base tecnica (manifesto, frontmatter, cross-link) e <b>non costituisce garanzia</b> di sicurezza, funzionalità o idoneità all'uso. L'utente è l'unico responsabile dell'uso dei contenuti scaricati.</p>

      <h2>6. Declino di responsabilità</h2>
      <p>RoboGarage è fornito "<b>così com'è</b>" ("as is"), senza garanzie di alcun tipo, espresse o implicite. Il titolare <b>Leonardo Martellini</b> e i collaboratori <b>declinano ogni responsabilità</b> per:</p>
      <ul>
        <li>Danni diretti o indiretti derivanti dall'uso o dall'impossibilità di usare il servizio;</li>
        <li>Perdita di dati, profitti o opportunità;</li>
        <li>Contenuti di terze parti caricati o scaricati tramite la piattaforma;</li>
        <li>Vulnerabilità di skill, plugin o agent installati tramite RoboGarage.</li>
      </ul>

      <h2>7. Proprietà intellettuale</h2>
      <p>Il software RoboGarage è distribuito sotto <b>licenza MIT</b>. I contenuti caricati dagli utenti restano di proprietà dei rispettivi autori.</p>

      <h2>8. Limitazioni di utilizzo</h2>
      <p>È vietato utilizzare RoboGarage per:</p>
      <ul>
        <li>Caricare contenuti illegali, diffamatori o che violano diritti di terzi;</li>
        <li>Distribuire malware, codice malevolo o skill progettate per danneggiare sistemi altrui;</li>
        <li>Violare la privacy altrui o raccogliere dati personali senza consenso.</li>
      </ul>

      <h2>9. Modifiche e interruzione del servizio</h2>
      <p>Il servizio può essere modificato, sospeso o interrotto in qualsiasi momento senza preavviso. Essendo un progetto free, non è garantito alcun livello di servizio (SLA).</p>

      <h2>10. Legge applicabile e foro competente</h2>
      <p>I presenti termini sono regolati dalla legge italiana. Per ogni controversia è competente il foro del luogo di residenza o domicilio del consumatore, se ubicato in Italia, ovvero il foro di residenza del titolare.</p>

      <h2>11. Contatti</h2>
      <p>Per domande su questi termini: contatta l'amministratore dell'istanza RoboGarage che stai utilizzando.</p>

      <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid var(--line)' }} />
      <p className="dim" style={{ fontSize: 12 }}>
        © 2026 Leonardo Martellini. Tutti i diritti riservati. RoboGarage è distribuito sotto licenza MIT.
      </p>
    </div>
  );
}
