/**
 * Comando: robogarage login --token <token> [--base-url <url>] [--agent <codex|claude|crush|pi|cursor|gemini>]
 * Salva il PAT/JWT in ~/.robogarage/config.json e installa l'adattatore per l'agent scelto.
 */

import { RoboGarageClient } from '../client.js';
import { saveConfig, loadConfig } from '../config.js';
import { loginCodex, installCodex } from '../adapters/codex.js';
import { loginClaude, installClaude } from '../adapters/claude.js';
import { loginCrush, installCrush } from '../adapters/opencode.js';
import { loginPi, installPi } from '../adapters/pi.js';
import { loginCursor, installCursor } from '../adapters/cursor.js';
import { loginGemini, installGemini } from '../adapters/gemini.js';

export async function loginCommand(args: string[]): Promise<void> {
  let token = '';
  let baseUrl: string | undefined;
  let agent: 'codex' | 'claude' | 'crush' | 'pi' | 'cursor' | 'gemini' | undefined;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--token' || a === '-t') token = args[++i] || '';
    else if (a === '--base-url' || a === '-u') baseUrl = args[++i] || undefined;
    else if (a === '--agent' || a === '-a') agent = (args[++i] || '') as any;
  }

  if (!token) {
    console.error('✗ Token mancante. Usa: robogarage login --token <il_tuo_pat>');
    process.exit(1);
  }

  const config = loadConfig();
  config.token = token;
  if (baseUrl) config.baseUrl = baseUrl;
  saveConfig(config);

  const client = new RoboGarageClient(config.baseUrl, token);
  try {
    const health = await client.health();
    if (!health.ok) throw new Error('Backend non sano');
    console.log(`✓ Autenticato su RoboGarage (${config.baseUrl})`);
    console.log(`  Token salvato in ~/.robogarage/config.json`);
  } catch (e: any) {
    console.error(`✗ Errore di connessione: ${e.message}`);
    process.exit(1);
  }

  if (agent) {
    switch (agent) {
      case 'codex':
        await loginCodex(token, config.baseUrl);
        await installCodex(client, 'robogarage', 'Skill RoboGarage collegata al tuo account');
        break;
      case 'claude':
        await loginClaude(token, config.baseUrl);
        await installClaude(client, 'robogarage', 'Skill RoboGarage collegata al tuo account');
        break;
      case 'crush':
        await loginCrush(token, config.baseUrl);
        await installCrush(client, 'robogarage', 'Skill RoboGarage collegata al tuo account');
        break;
      case 'pi':
        await loginPi(token, config.baseUrl);
        await installPi(client, 'robogarage', 'Skill RoboGarage collegata al tuo account');
        break;
      case 'cursor':
        await loginCursor(token, config.baseUrl);
        await installCursor(client, 'robogarage', 'Skill RoboGarage collegata al tuo account');
        break;
      case 'gemini':
        await loginGemini(token, config.baseUrl);
        await installGemini(client, 'robogarage', 'Skill RoboGarage collegata al tuo account');
        break;
    }
  } else {
    console.log('\n🤖 Agent supportati: --agent codex | claude | crush | pi | cursor | gemini');
    console.log('Esempio: robogarage login --token xxx --agent codex');
  }
}
