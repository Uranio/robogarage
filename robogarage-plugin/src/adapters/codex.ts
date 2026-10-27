/**
 * Adattatore Codex CLI.
 * I plugin per Codex sono moduli JS/TS che esportano funzioni hook.
 * Questo modulo fornisce gli hook e il codice da incollare in ~/.codex/plugins/robogarage.ts
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';

export interface CodexPluginHooks {
  'tool.execute.before'?: (input: any) => Promise<any> | any;
  'tool.execute.after'?: (input: any, output: any) => Promise<any> | any;
  'message.before'?: (input: any) => Promise<any> | any;
}

export function codexPluginCode(baseUrl: string, token: string): string {
  return `// @file: ~/.codex/plugins/robogarage.ts
// Plugin RoboGarage per Codex CLI
// Generato da robogarage-plugin v1.0.0

import { RoboGarageClient } from 'robogarage-plugin';

const client = new RoboGarageClient('${baseUrl}', '${token}');

export const hooks: CodexPluginHooks = {
  async 'tool.execute.before'(input) {
    // Puoi intercettare chiamate a tool e arricchirle con dati da RoboGarage
    return input;
  },
};

// Esporta anche il client per usarlo da script
export { client };
`;
}

export async function installCodex(client: RoboGarageClient): Promise<void> {
  const config = loadConfig();
  if (!config.token) throw new Error('Nessun token configurato. Esegui prima: robogarage login');

  const code = codexPluginCode(config.baseUrl, config.token);
  console.log(code);
  console.log('\n---\nSalva il codice sopra in ~/.codex/plugins/robogarage.ts\n');
}

export async function loginCodex(token: string, baseUrl?: string): Promise<void> {
  const config = loadConfig();
  config.token = token;
  if (baseUrl) config.baseUrl = baseUrl;
  saveConfig(config);

  const c = new RoboGarageClient(config.baseUrl, token);
  try {
    await c.health();
    console.log(`✓ Collegato a RoboGarage (${config.baseUrl})`);
  } catch (e: any) {
    console.error(`✗ Impossibile contattare RoboGarage: ${e.message}`);
    process.exit(1);
  }
}
