# robogarage-plugin

Plugin ufficiale per collegare **Codex CLI**, **Claude Code**, **OpenCode/Crush**, **Pi**, **Cursor** e **Gemini** al tuo account **RoboGarage** e automatizzare tutte le operazioni su skill, repository, import, publish e validazione.

## Cosa fa

- Si autentica con un **Personal Access Token (PAT)** di RoboGarage (mostrato una sola volta)
- Installa adattatori nativi per i principali agent AI
- Importa skill da RoboGarage nel tuo agent locale
- Pubblica skill locali su RoboGarage con validazione automatica
- Valida skill tramite l'API di RoboGarage (`POST /api/repos/:id/validate`)
- Lista le skill disponibili nel marketplace
- Crea nuove skill locali con scaffolding (`init`)

## Installazione

```bash
# Dal repository GitHub
git clone https://github.com/Uranio/robogarage-plugin.git
cd robogarage-plugin

# Installa dipendenze e build
npm install
npm run build

# Link globale (opzionale, per usare il comando robogarage ovunque)
npm link
```

Oppure installa direttamente da npm (quando pubblicato):

```bash
npm install -g robogarage-plugin
```

## Configurazione

Ottieni un token dal tuo account RoboGarage:

1. Apri RoboGarage (es. `https://robogarage-back2.onrender.com`)
2. Vai su **Plugin** o chiama l'API `POST /api/users/tokens` con il tuo JWT
3. Copia il token (viene mostrato **una sola volta**)

Poi configura il plugin:

```bash
robogarage login --token rk_abc123def456 --agent codex
```

Agent supportati: `codex`, `claude`, `opencode`, `pi`, `cursor`, `gemini`.

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `robogarage login --token <TOKEN> --agent <agent>` | Salva il token e installa l'adattatore |
| `robogarage list [--query <q>]` | Lista skill nel marketplace RoboGarage |
| `robogarage init <nome> [--kind <tipo>]` | Scaffolla una nuova skill locale |
| `robogarage import <owner/skill>` | Scarica una skill da RoboGarage |
| `robogarage validate <owner/skill> [--target <target>]` | Valida una skill via API RoboGarage |
| `robogarage publish <cartella>` | Pubblica una cartella locale su RoboGarage |

## Adattatori per agent

### Codex CLI
Il plugin scrive la configurazione in `~/.codex/config.toml` e genera il codice del plugin da salvare in `~/.codex/plugins/robogarage.ts`.

```bash
robogarage login --token <TOKEN> --agent codex
```

Poi:
```bash
codex plugin marketplace add https://github.com/Uranio/robogarage-plugin
codex plugin install robogarage@robogarage-plugin
codex reload-plugins
```

### Claude Code
Crea una skill Agent Skills in `~/.claude/skills/robogarage/SKILL.md` configurata con il tuo token RoboGarage.

```bash
robogarage login --token <TOKEN> --agent claude
```

Carica in Claude Code con `/skill robogarage`.

### OpenCode / Crush
Crea una skill in `~/.config/opencode/skills/robogarage/SKILL.md`.

```bash
robogarage login --token <TOKEN> --agent opencode
```

### Pi coding agent
Crea una skill in `~/.pi/skills/robogarage/SKILL.md`.

```bash
robogarage login --token <TOKEN> --agent pi
```

### Cursor
Crea `.cursor-plugin/plugin.json` e la skill nella cartella del progetto.

```bash
robogarage login --token <TOKEN> --agent cursor
```

### Gemini CLI
Crea `.gemini/gemini-extension.json` e la skill nella cartella del progetto.

```bash
robogarage login --token <TOKEN> --agent gemini
```

## Sicurezza

- Il token viene salvato in `~/.robogarage/config.json` con permessi `600` (solo lettura/scrittura per il proprietario)
- Il token non viene mai inviato a terzi, solo al tuo backend RoboGarage
- Puoi revocare il token in qualsiasi momento da RoboGarage (`DELETE /api/users/tokens/:id`)
- Il valore in chiaro del token non è mai memorizzato sul server (solo hash scrypt)

## Esempio di flusso completo

```bash
# 1. Login e configurazione per Codex
robogarage login --token rk_abc123 --agent codex

# 2. Crea una nuova skill locale
robogarage init mia-skill --kind skill

# 3. Valida la skill su RoboGarage (prima di pubblicare)
robogarage validate leonardo/mia-skill --target claude

# 4. Pubblica la skill su RoboGarage
robogarage publish ./mia-skill --visibility public --kind skill

# 5. Importa una skill da un altro utente
robogarage import neo/web-scraper
```

## Licenza

MIT — progetto **free** di **Leonardo Martellini**.

Vedi `LICENSE` per i dettagli.

## Sicurezza e Privacy

Questo plugin non raccoglie dati personali. Tutti i dati restano tra il tuo agent e la tua istanza RoboGarage. Per informazioni dettagliate, consulta la [Privacy Policy di RoboGarage](https://robogarage-2-frontend.onrender.com/privacy).
