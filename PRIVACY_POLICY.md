# Privacy Policy — RoboGarage
Last updated: October 27, 2026 — Version 1.1

Data controller: **Leonardo Martellini** — progetto **RoboGarage** (free/open source).
Email privacy: privacy@robogarage.example.com (sostituisci con l'email dell'istanza in uso).
DPO: non nominato (progetto free, sotto soglia). Per self-hosting Enterprise il cliente è titolare autonomo.

RoboGarage è un progetto **free** sviluppato da **Leonardo Martellini**. Tutti i diritti sono riservati. Distribuito sotto licenza MIT.

---

## 1. Dati raccolti e finalità (base giuridica GDPR)

| Dato | Perché lo raccogliamo | Base giuridica |
|------|----------------------|----------------|
| **Account**: username, email (opzionale), display name, password hash (scrypt+salt, mai in chiaro), avatar (max 2 MB) | Registrazione, autenticazione, profilo utente | Art. 6(1)(b) esecuzione contratto |
| **Contenuti**: skill, repository, commits, pull request, stelle, collaboratori, visibilità pubblica/privata | Erogazione servizio di hosting skill/agent/plugin | Art. 6(1)(b) esecuzione contratto |
| **Token personali (PAT)**: hashati con scrypt; valore in chiaro **mai memorizzato** | Automazione API, import, publish, validazione | Art. 6(1)(b) |
| **Tecnici**: log server (IP, user-agent, timestamp, errori), JWT solo nel browser (scadenza 7 gg) | Sicurezza, rate limiting, prevenzione abusi | Art. 6(1)(f) interesse legittimo |
| **Recupero password**: token monouso 30 min + email | Reset password | Art. 6(1)(b) |
| **Email di servizio**: transazionali (benvenuto, reset, alert sicurezza) | Gestione account | Art. 6(1)(b) |

Nessuna profilazione pubblicitaria, nessuna vendita di dati, nessun cookie di tracciamento. Solo cookie tecnici di sessione.

---

## 2. Dove risiedono i dati

- **Backend**: hosted in UE (specificare località dell'istanza, es. Hetzner Falkenstein).
- **Database**: SQLite (`./data/*.db`), git repos in `./data/repos`, avatar in `./data/avatars`.
- **Produzione**: Postgres EU + S3 EU con backup cifrati quotidiani (retention 30 giorni).
- Nessun trasferimento fuori UE/SEE salvo subprocessori con clausole contrattuali tipo (es. Stripe, provider email — vedi §5).

---

## 3. Condivisione

- **Repository pubblici**: visibili a chiunque + marketplace Claude (solo plugin pubblici validati, con sha256 reale).
- **Repository privati**: visibili solo a te/collaboratori; le API restituiscono 404 agli estranei (non si rivela l'esistenza).
- Subprocessori: hosting EU, Stripe, provider SMTP. Lista aggiornata su richiesta.

---

## 4. Conservazione

- Account attivo: per tutta la vita dell'account + 24 mesi log aggregati.
- Cancellazione account: esportazione repo per 90 giorni (git/archive), poi cancellazione DB + git + avatar entro 30 giorni.
- Fatture: 10 anni (obbligo fiscale).
- Token di recupero scaduti: cancellati immediatamente.
- Backup: cancellazione entro 30 giorni dal ciclo.

---

## 5. I tuoi diritti (GDPR Art. 15–22)

Accesso, rettifica, cancellazione, limitazione, portabilità (esportazione JSON + tarball git via UI/API), opposizione, revoca del consenso.
Scrivere a privacy@robogarage.example.com con il proprio username; rispondiamo entro 30 giorni. Reclamo all'autorità di controllo (es. Garante privacy in Italia).

---

## 6. Sicurezza (Art. 32 GDPR)

- Password hashate con scrypt + sale.
- JWT HS256 con `JWT_SECRET` lungo e rotato.
- TLS ovunque (HSTS).
- Backup cifrati.
- Rate limit su login/recupero.
- Validazione upload (tipo/dimensione, avatar anti-traversal).
- Notifica violazioni entro 72 ore all'autorità e, se alto rischio, agli interessati.

---

## 7. Minori

Il servizio non è consentito ai minori di 16 anni (o 14 dove il consenso dei genitori è permesso).

---

## 8. Cookie

Solo tecnici (sessione JWT, preferenze, load balancer). Nessun cookie di profilazione. Banner solo se si aggiunge analytics/marketing — oggi assente.

---

## 9. Modifiche

Notifichiamo 30 giorni prima via email per modifiche sostanziali; l'uso continuato = accettazione. Versioni precedenti conservate nel repo.

---

## 10. Contatti

Per richieste privacy: privacy@robogarage.example.com (sostituisci con l'email dell'istanza in uso).

---

© 2026 **Leonardo Martellini**. Tutti i diritti riservati.
