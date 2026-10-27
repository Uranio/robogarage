/**
 * Comando: robogarage list [--query <q>]
 * Lista le skill disponibili nel marketplace di RoboGarage.
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig } from '../config.js';

export async function listCommand(args: string[]): Promise<void> {
  const config = loadConfig();
  if (!config.token) {
    console.error('✗ Nessun token. Esegui: robogarage login --token <token>');
    process.exit(1);
  }

  let query = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--query' || args[i] === '-q') query = args[++i] || '';
  }

  const client = new RoboGarageClient(config.baseUrl, config.token);
  try {
    const repos = await client.listRepos(query);
    if (repos.length === 0) {
      console.log('Nessuna skill trovata.');
      return;
    }
    console.log(`📦 Skill disponibili su RoboGarage (${repos.length}):\n`);
    for (const r of repos) {
      const kindEmoji = r.kind === 'plugin' ? '🔌' : r.kind === 'agent' ? '🤖' : '📦';
      console.log(
        `  ${kindEmoji} ${r.owner}/${r.name}  [${r.kind}]  ${r.visibility}  ★${r.stars}`
      );
      if (r.description) console.log(`     ${r.description.slice(0, 80)}`);
    }
    console.log('\nPer importare: robogarage import owner/skill-name');
  } catch (e: any) {
    console.error(`✗ Errore: ${e.message}`);
    process.exit(1);
  }
}
