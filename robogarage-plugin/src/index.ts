#!/usr/bin/env node
/**
 * RoboGarage Plugin CLI — punto di ingresso.
 * Collega Codex, Claude Code, OpenCode/Crush, Pi, Cursor e Gemini a RoboGarage.
 */

import { loginCommand } from './commands/login.js';
import { listCommand } from './commands/list.js';
import { importCommand } from './commands/import.js';
import { validateCommand } from './commands/validate.js';
import { publishCommand } from './commands/publish.js';
import { initCommand } from './commands/init.js';

const cmd = process.argv[2];
const args = process.argv.slice(3);

async function main(): Promise<void> {
  switch (cmd) {
    case 'login':
      await loginCommand(args);
      break;
    case 'list':
      await listCommand(args);
      break;
    case 'import':
      await importCommand(args);
      break;
    case 'validate':
      await validateCommand(args);
      break;
    case 'publish':
      await publishCommand(args);
      break;
    case 'init':
      await initCommand(args);
      break;
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;
    default:
      console.error(`✗ Comando sconosciuto: ${cmd}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
RoboGarage Plugin v1.0.0 — collega i tuoi agent a RoboGarage

Utilizzo:
  robogarage <comando> [opzioni]

Comandi:
  login --token <token> [--base-url <url>] [--agent <codex|claude|opencode|pi|cursor|gemini>]
      Salva il PAT/JWT e installa l'adattatore per l'agent scelto.

  list [--query <q>]
      Lista le skill disponibili nel marketplace di RoboGarage.

  init <nome> [--kind skill|agent|plugin]
      Scaffolla una nuova skill locale con tutti i file richiesti.

  import <owner/skill> [--name <n>] [--visibility public|private]
      Scarica una skill da RoboGarage e la salva localmente.

  validate <owner/skill> [--ref <branch>] [--target <claude|opencode|codex|cursor|gemini>]
      Valida una skill tramite l'API di RoboGarage.

  publish <cartella> [--name <n>] [--visibility public|private] [--kind skill|agent|plugin]
      Pubblica una cartella locale (con SKILL.md) su RoboGarage, con validazione automatica.

Esempi:
  robogarage login --token rk_abc123 --agent codex
  robogarage list
  robogarage init mia-skill --kind skill
  robogarage import leonardo/mia-skill
  robogarage validate leonardo/mia-skill --target claude
  robogarage publish ./mia-skill --visibility public --kind skill

Documentazione: https://github.com/Uranio/robogarage-plugin
Progetto free di Leonardo Martellini — MIT License
`);
}

main().catch((e) => {
  console.error(`✗ Errore: ${e.message}`);
  process.exit(1);
});
