/**
 * Comando: robogarage import <owner/skill> [--name <n>] [--visibility public|private]
 * Importa una skill da RoboGarage (via archive) e la salva localmente per l'agent configurato.
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function importCommand(args: string[]): Promise<void> {
  const config = loadConfig();
  if (!config.token) {
    console.error('✗ Nessun token. Esegui: robogarage login --token <token>');
    process.exit(1);
  }

  let target = '';
  let name: string | undefined;
  let visibility: 'public' | 'private' = 'private';

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--name' || a === '-n') name = args[++i] || undefined;
    else if (a === '--visibility' || a === '-v')
      visibility = (args[++i] || 'private') as any;
    else if (!a.startsWith('-')) target = a;
  }

  if (!target) {
    console.error('✗ Specifica la skill: robogarage import owner/skill-name');
    process.exit(1);
  }

  const [owner, skillName] = target.split('/');
  if (!owner || !skillName) {
    console.error('✗ Formato non valido. Usa: robogarage import owner/skill-name');
    process.exit(1);
  }

  const client = new RoboGarageClient(config.baseUrl, config.token);
  try {
    const repos = await client.listRepos();
    const repo = repos.find((r) => r.owner === owner && r.name === skillName);
    if (!repo) {
      console.error(`✗ Skill ${owner}/${skillName} non trovata`);
      process.exit(1);
    }

    // Scarica l'archivio
    const archiveRes = await fetch(
      `${config.baseUrl}/api/repos/${repo.id}/archive?ref=${repo.default_branch}`,
      { headers: { Authorization: `Bearer ${config.token}` } }
    );
    if (!archiveRes.ok) throw new Error(`Impossibile scaricare l'archivio: ${archiveRes.status}`);

    const buf = await archiveRes.arrayBuffer();

    // Estrai in ~/.robogarage/imports/<owner>-<skill>
    const outDir = path.join(
      os.homedir(),
      '.robogarage',
      'imports',
      `${owner}-${skillName}`
    );
    fs.mkdirSync(outDir, { recursive: true });

    const { execSync } = await import('child_process');
    execSync(`tar -xzf - -C "${outDir}"`, { input: Buffer.from(buf) });

    console.log(`✓ Importata ${owner}/${skillName} in ${outDir}`);
    console.log(`  Skill pronta per essere caricata nel tuo agent.`);
  } catch (e: any) {
    console.error(`✗ Errore import: ${e.message}`);
    process.exit(1);
  }
}
