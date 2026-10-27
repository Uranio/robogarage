# robogarage-plugin

Plugin ufficiale per collegare **Codex CLI**, **Claude Code**, **Crush/OpenCode**, **Pi**, **Cursor** e **Gemini** al tuo account **RoboGarage** e automatizzare tutte le operazioni su skill, repository, import, publish e validazione.

## Cosa fa

- Si autentica con un **Personal Access Token (PAT)** di RoboGarage (mostrato una sola volta)
- Installa skill **Agent Skills** (standard aperto, https://agentskills.io) per i principali agent AI
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

Agent supportati: `codex`, `claude`, `crush`, `pi`, `cursor`, `gemini`.

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `robogarage login --token <TOKEN> --agent <agent>` | Salva il token e installa l'adattatore |
| `robogarage list [--query <q>]` | Lista skill nel marketplace RoboGarage |
| `robogarage init <nome> [--kind <tipo>]` | Scaffolla una nuova skill locale |
| `robogarage import <owner/skill>` | Scarica una skill da RoboGarage |
| `robogarage validate <owner/skill> [--target <target>]` | Valida una skill via API RoboGarage |
| `robogarage publish <cartella>` | Pubblica una cartella locale su RoboGarage |

## Directory skill per ogni agent

Il plugin installa skill nello standard **Agent Skills** (SKILL.md con frontmatter YAML) nelle directory corrette per ogni agent:

| Agent | Directory | Comando |
|-------|-----------|---------|
| **Codex CLI** | `~/.codex/skills/<nome>/SKILL.md` | `--agent codex` |
| **Claude Code** | `~/.claude/skills/<nome>/SKILL.md` | `--agent claude` |
| **Crush / OpenCode** | `~/.config/crush/skills/<nome>/SKILL.md` (anche `~/.config/agents/skills/`, `~/.agents/skills/`) | `--agent crush` |
| **Pi coding agent** | `~/.agents/skills/<nome>/SKILL.md` (anche `~/.pi/agent/skills/`) | `--agent pi` |
| **Cursor** | `~/.cursor/skills/<nome>/SKILL.md` | `--agent cursor` |
| **Gemini CLI** | `~/.gemini/skills/<nome>/SKILL.md` | `--agent gemini` |

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

## Sicurezza

- Il token viene salvato in `~/.robogarage/config.json` con permessi `600` (solo lettura/scrittura per il proprietario)
- Il token non viene mai inviato a terzi, solo al tuo backend RoboGarage
- Puoi revocare il token in qualsiasi momento da RoboGarage (`DELETE /api/users/tokens/:id`)
- Il valore in chiaro del token non è mai memorizzato sul server (solo hash scrypt)

## Licenza

MIT — progetto **free** di **Leonardo Martellini**.

Vedi `LICENSE` per i dettagli.

## Sicurezza e Privacy

Questo plugin non raccoglie dati personali. Tutti i dati restano tra il tuo agent e la tua istanza RoboGarage. Per informazioni dettagliate, consulta la [Privacy Policy di RoboGarage](https://robogarage-2-frontend.onrender.com/privacy).
