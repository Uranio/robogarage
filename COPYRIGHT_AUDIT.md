# 📄 Audit Copyright e Conflitti Commerciali — RoboGarage

**Data:** 27 ottobre 2026  
**Progetto:** RoboGarage  
**Autore:** Leonardo Martellini  
**Stato:** Bozza per valutazione legale  
**Licenza codice:** MIT

---

## 1. Proprietà del codice RoboGarage

### Codice sorgente (backend, frontend, plugin, skill interna)

Il codice sorgente di RoboGarage è di proprietà di **Leonardo Martellini** ed è distribuito sotto **licenza MIT**.

Questo significa che:
- Chiunque può usare, copiare, modificare, distribuire e vendere il codice.
- È richiesto di includere la nota di copyright e la licenza MIT in tutte le copie.
- Il software è fornito "così com'è", senza garanzie e senza responsabilità per l'autore.

**File chiave:** `LICENSE`, `robogarage-plugin/LICENSE`, `skills/github-robogarage/LICENSE`.

---

## 2. Proprietà dei contenuti caricati dagli utenti (skill, repo, plugin)

### Regola generale

I contenuti caricati dagli utenti su RoboGarage (skill, repository, AGENT.md, SKILL.md, script, immagini, avatar) **restano di proprietà dei rispettivi autori**.

RoboGarage non rivendica alcuna proprietà su tali contenuti. Concedendo i contenuti alla piattaforma, l'utente accorda a RoboGarage una **licenza non esclusiva** di:
- ospitare i contenuti sui server di RoboGarage,
- renderli visibili agli altri utenti (se pubblici),
- validarli, indicizzarli e distribuirli tramite il marketplace,
- permettere il fork e l'installazione da parte di altri utenti secondo la licenza scelta dall'autore.

### Licenza delle skill pubbliche

L'autore di una skill pubblica sceglie la licenza applicabile (consigliata MIT, ma può essere qualsiasi). Se l'autore non inserisce un file `LICENSE` nel repo, la skill si intende con tutti i diritti riservati (copyright "all rights reserved") anche se ospitata su RoboGarage.

RoboGarage non può concedere sub-licenze sui contenuti utenti: chi scarica una skill deve rispettare la licenza scelta dall'autore.

---

## 3. Marchi e nomi

### Nome "RoboGarage"

Il nome "RoboGarage" è un nome di progetto utilizzato da Leonardo Martellini. Al momento **non risulta registrato come marchio** presso alcun ufficio brevetti e marchi.

Se si intende espandere il progetto in modo commerciale, si consiglia di:
1. Effettuare una ricerca di anteriorità sui marchi (UIBM in Italia, EUIPU in UE, USPTO negli USA).
2. Registrare il marchio "RoboGarage" per le classi pertinenti (software, scaricamento di app, servizi di hosting, ecc.).

### Nomi di skill e repo

I nomi delle skill e dei repository creati dagli utenti sono di responsabilità degli stessi autori. RoboGarage non verifica automaticamente se un nome di skill viola marchi altrui. In caso di segnalazione di violazione, RoboGarage potrà rimuovere il contenuto (vedi Terms of Service, sezione 3).

---

## 4. Dipendenze di terze parti (supply chain)

RoboGarage utilizza librerie open source con varie licenze. Di seguito un riepilogo non esaustivo delle principali:

| Componente | Licenza | Note |
|------------|---------|------|
| React | MIT | Frontend UI |
| Vite | MIT | Build tool frontend |
| Hono | MIT | Backend framework |
| better-sqlite3 | MIT | Database SQLite |
| TypeScript | Apache 2.0 | Linguaggio |
| Vitest | MIT | Test backend |
| tsx | MIT | Esecuzione TypeScript |
| better-sqlite3 | MIT | Binding SQLite |
| React Router | MIT | Routing frontend |

**Obblighi:**
- Le licenze MIT e Apache 2.0 permettono l'uso commerciale, ma richiedono di includere la nota di copyright originale e la licenza stessa nelle distribuzioni.
- Non è necessario rilasciare il proprio codice sorgente (non è copyleft come GPL).

---

## 5. Possibili conflitti commerciali

### 5.1 Skill di terze parti con licenze restrittive

Gli utenti possono importare skill che contengono codice o contenuti con licenze non compatibili con l'uso commerciale (es. CC BY-NC, GPL, licenze proprietarie). RoboGarage le ospita come "contenuti utenti", ma:
- Non verifica la compatibilità commerciale delle skill importate.
- Non garantisce che una skill pubblica sia effettivamente libera da vincoli di terzi.
- Un utente che scarica e usa una skill in ambito commerciale potrebbe violare la licenza dell'autore originale.

**Raccomandazione:** Aggiungere un avviso esplicito nei Termini di Servizio e nella pagina di importazione: "L'utente è l'unico responsabile della verifica delle licenze delle skill che importa o installa".

### 5.2 Uso del nome "RoboGarage" da terzi

Poiché il marchio non è registrato, terzi potrebbero utilizzare lo stesso nome per progetti simili, creando confusione. Se il progetto cresce, la registrazione del marchio diventa prioritaria.

### 5.3 Contributi esterni

Se in futuro si accettano contributi di codice da altri sviluppatori (pull request su GitHub), senza un **CLA (Contributor License Agreement)** si potrebbero generare incertezze sulla titolarità del codice contribuito.

**Raccomandazione:** Predisporre un CLA semplice se si prevede di accettare contributi esterni rilevanti.

### 5.4 Dati personali e GDPR

RoboGarage raccoglie dati personali (username, email opzionale, password hash, avatar). Il titolare del trattamento è il gestore dell'istanza. È già presente una `PRIVACY_POLICY.md` conforme ai principi GDPR (Art. 6, Art. 15-22).

**Rischio commerciale:** In caso di violazione dei dati, il titolare potrebbe essere soggetto a sanzioni. Si consiglia un'assicurazione RC professionale se il servizio viene offerto a terzi.

---

## 6. Raccomandazioni operative

### Prima di andare in produzione commerciale

| Azione | Priorità | Descrizione |
|--------|----------|-------------|
| Registrare marchio "RoboGarage" | Alta | Presso UIBM/EUIPO per proteggere il nome |
| Aggiungere CLA | Media | Se si accettano contributi esterni al codice |
| Avviso licenze skill | Alta | Disclaimer esplicito sulle licenze di terze parti nei Termini e nell'UI di import |
| Assicurazione RC | Media | Copertura per violazioni dati o danni da skill di terzi |
| Verifica dipendenze | Media | `npm audit fix --force` con test di regressione |
| Disconoscimento garanzie | Alta | Già presente in TERMS_OF_SERVICE.md (sezione 8) |

### Clausole consigliate da aggiungere ai Termini

1. **Licenza utente:** "L'utente mantiene la titolarità dei contenuti caricati e concede a RoboGarage una licenza non esclusiva, mondiale, royalty-free per ospitare e distribuire tali contenuti all'interno del servizio."

2. **Esclusione garanzie skill di terzi:** "RoboGarage non verifica e non garantisce la licenza, la sicurezza o la funzionalità di skill di terze parti. L'utente le usa a proprio rischio."

3. **Marchi:** "RoboGarage è un marchio di Leonardo Martellini. Gli altri nomi di prodotto e azienda possono essere marchi dei rispettivi proprietari."

---

## 7. Conclusione

Dal punto di vista del copyright, RoboGarage è in una posizione solida:
- Il codice è MIT e di proprietà chiara.
- I contenuti utenti rimangono di proprietà degli autori.
- Non sono stati trovati conflitti di licenza nel codice sorgente committato.

I rischi principali sono di natura **commerciale e di marchio** (nome non registrato, skill di terze parti con licenze sconosciute) piuttosto che di copyright sul codice stesso.

---

© 2026 Leonardo Martellini. Tutti i diritti riservati su questo documento. RoboGarage è distribuito sotto licenza MIT.
