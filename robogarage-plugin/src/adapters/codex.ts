/**
 * Adattatore Codex CLI (OpenAI).
 *
 * Codex usa un sistema di plugin basato su pacchetti npm pubblicati sul registro npm.
 * I plugin esportano hook che vengono eseguiti durante le sessioni.
 *
 * Installazione:
 *   codex plugin marketplace add <url-robogarage-marketplace>
 *   codex plugin install robogarage@robogarage-plugin
 *
 * Configurazione in ~/.codex/config.toml:
 *   [features] hooks = true
 *   [plugins."robogarage@robogarage-plugin"] enabled = true
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

const CODEX_CONFIG_DIR = path.join(process.env.HOME || '', '.codex');
const CODEX_CONFIG_FILE = path.join(CODEX_CONFIG_DIR, 'config.toml');

export interface CodexHooks {
  'tool.execute.before'?: (input: any) => Promise<any>;
  'tool.execute.after'?: (input: any, output: any) => Promise<any>;
  'message.before'?: (input: any) => Promise<any>;
}

/**
 * Genera il codice TypeScript del plugin Codex da salvare in ~/.codex/plugins/robogarage.ts
 * oppure da pubblicare come pacchetto npm.
 */
export function codexPluginCode(baseUrl: string, token: string): string {
  return `// ============================================================================
// RoboGarage Plugin per Codex CLI
// Generato automaticamente da robogarage-plugin v1.0.0
// ============================================================================

import { RoboGarageClient } from 'robogarage-plugin';

const client = new RoboGarageClient('${baseUrl}', '${token}');

export const hooks: Record<string, (input: any) => Promise<any>> = {
  async 'tool.execute.before'(input) {
    // Intercetta le chiamate a tool e può arricchirle con dati da RoboGarage
    return input;
  },
  async 'tool.execute.after'(input, output) {
    // Elabora l'output dopo l'esecuzione di un tool
    return output;
  },
  async 'message.before'(input) {
    // Intercetta i messaggi prima che vengano inviati al modello
    return input;
  },
};

// Esporta il client per uso da script esterni
export { client };
`;
}

/**
 * Scrive la configurazione TOML di Codex per abilitare il plugin.
 */
export function writeCodexConfig(token: string, baseUrl?: string): void {
  const config = loadConfig();
  if (baseUrl) config.baseUrl = baseUrl;
  config.token = token;
  config.agent = 'codex';
  saveConfig(config);

  fs.mkdirSync(CODEX_CONFIG_DIR, { recursive: true });

  const toml = `
# ============================================================================
# Configurazione RoboGarage per Codex CLI
# Generato da robogarage-plugin v1.0.0
# ============================================================================

[features]
hooks = true

[plugins."robogarage@robogarage-plugin"]
enabled = true

[plugin_config."robogarage@robogarage-plugin"]
base_url = "${config.baseUrl}"
token_prefix = "${token.slice(0, 8)}..."
`;
  fs.writeFileSync(CODEX_CONFIG_FILE, toml.trim() + '\n', { mode: 0o600 });
}

/**
 * Installa l'adattatore Codex: scrive config.toml e mostra il codice del plugin.
 */
export async function installCodex(client: RoboGarageClient): Promise<void> {
  const config = loadConfig();
  if (!config.token) throw new Error('Nessun token configurato. Esegui prima: robogarage login');

  const c = new RoboGarageClient(config.baseUrl, config.token);
  try {
    await c.health();
  } catch (e: any) {
    console.error(`✗ Impossibile contattare RoboGarage: ${e.message}`);
    process.exit(1);
  }

  writeCodexConfig(config.token, config.baseUrl);

  console.log('✓ Configurazione Codex scritta in ~/.codex/config.toml');
  console.log('\n📋 Prossimi passi:');
  console.log('  1. codex plugin marketplace add https://github.com/Uranio/robogarage-plugin');
  console.log('  2. codex plugin install robogarage@robogarage-plugin');
  console.log('  3. codex reload-plugins');
  console.log('\n🔐 Il token è salvato in ~/.robogarage/config.json (permessi 600)');
}

export async function loginCodex(token: string, baseUrl?: string): Promise<void> {
  const config = loadConfig();
  config.token = token;
  if (baseUrl) config.baseUrl = baseUrl;
  saveConfig(config);

  const c = new RoboGarageClient(config.baseUrl, token);
  try {
    await c.health();
    console.log(`✓ Autenticato su RoboGarage (${config.baseUrl})`);
  } catch (e: any) {
    console.error(`✗ Impossibile contattare RoboGarage: ${e.message}`);
    process.exit(1);
  }
}
