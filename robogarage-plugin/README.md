# robogarage-plugin

Plugin ufficiale per collegare **Codex CLI**, **Claude Code**, **OpenCode**, **Pi** e altri agent al tuo account **RoboGarage** e automatizzare tutte le operazioni su skill, repository, import, publish e validazione.

## Cosa fa

- Si autentica con un **Personal Access Token (PAT)** di RoboGarage (mostrato una sola volta)
- Installa adattatori per i principali agent AI
- Importa skill da RoboGarage nel tuo agent locale
- Pubblica skill locali su RoboGarage
- Valida skill tramite l'API di RoboGarage (`POST /api/repos/:id/validate`)
- Lista le skill disponibili nel marketplace

## Installazione

```bash
# Clona il repo
git clone https://github.com/Uranio/robogarage-plugin.git
cd robogarage-plugin

# Installa dipendenze e build
npm install
npm run build

# Link globale (opzionale)
npm link
```

## Configurazione

Ottieni un token dal tuo account RoboGarage:

1. Apri RoboGarage (es. `https://robogarage-back2.onrender.com`)
2. Vai su **Account → Token personali** (o chiama `POST /api/users/tokens`)
3. Copia il token (viene mostrato una sola volta)

Poi configura il plugin:

```bash
robogarage login --token rk_abc123def456 --agent codex
```

Agent supportati: `codex`, `claude`, `opencode`, `pi`.

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `robogarage login --token <TOKEN> --agent <agent>` | Salva il token e installa l'adattatore |
| `robogarage list [--query <q>]` | Lista skill nel marketplace RoboGarage |
| `robogarage import <owner/skill>` | Scarica una skill da RoboGarage |
| `robogarage validate <owner/skill> [--target <target>]` | Valida una skill via API RoboGarage |
| `robogarage publish <cartella>` | Pubblica una cartella locale su RoboGarage |

## Adattatori agent

### Codex CLI
Il plugin genera il codice da salvare in `~/.codex/plugins/robogarage.ts`.

### Claude Code
Crea una skill in `~/.claude/skills/<nome>/SKILL.md` configurata con il tuo token RoboGarage.

### OpenCode
Crea una skill in `~/.config/opencode/skills/<nome>/SKILL.md`.

### Pi coding agent
Crea una skill in `~/.pi/skills/<nome>/SKILL.md`.

## Sicurezza

- Il token viene salvato in `~/.robogarage/config.json` con permessi `600`
- Il token non viene mai inviato a terzi, solo al tuo backend RoboGarage
- Puoi revocare il token in qualsiasi momento da RoboGarage (`DELETE /api/users/tokens/:id`)

## Licenza

MIT — progetto **free** di **Leonardo Martellini**.

Vedi `LICENSE` per i dettagli.
