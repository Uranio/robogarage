/**
 * Comando: robogarage publish <cartella> [--name <n>] [--visibility public|private] [--kind skill|agent|plugin]
 * Pubblica una cartella locale (con SKILL.md) su RoboGarage come nuovo repository.
 * Prima di pubblicare, valida la skill tramite l'API di RoboGarage.
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

export async function publishCommand(args: string[]): Promise<void> {
  const config = loadConfig();
  if (!config.token) {
    console.error('✗ Nessun token. Esegui: robogarage login --token <token>');
    process.exit(1);
  }

  let folder = '';
  let name: string | undefined;
  let visibility: 'public' | 'private' = 'private';
  let kind: 'skill' | 'agent' | 'plugin' = 'skill';

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--name' || a === '-n') name = args[++i] || undefined;
    else if (a === '--visibility' || a === '-v')
      visibility = (args[++i] || 'private') as any;
    else if (a === '--kind' || a === '-k') kind = (args[++i] || 'skill') as any;
    else if (!a.startsWith('-')) folder = a;
  }

  if (!folder) {
    console.error('✗ Specifica la cartella: robogarage publish ./mia-skill');
    process.exit(1);
  }

  const absFolder = path.resolve(folder);
  if (!fs.existsSync(absFolder)) {
    console.error(`✗ Cartella non trovata: ${absFolder}`);
    process.exit(1);
  }

  const skillMdPath = path.join(absFolder, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    console.error(`✗ SKILL.md non trovato in ${absFolder}`);
    process.exit(1);
  }

  const skillMd = fs.readFileSync(skillMdPath, 'utf-8');
  const client = new RoboGarageClient(config.baseUrl, config.token);

  try {
    const repoName = name || extractNameFromFrontmatter(skillMd) || path.basename(absFolder);
    const description = extractDescriptionFromFrontmatter(skillMd) || '';

    console.log(`📦 Creazione repository ${repoName}...`);

    const repo = await client.createRepo({
      owner: config.username || '',
      name: repoName,
      description,
      visibility,
      kind,
      plugin_target: kind === 'plugin' ? 'claude' : undefined,
    });

    console.log(`✓ Repository creato: ${repo.owner}/${repo.name} (${repo.visibility})`);

    // Valida la skill prima di importarla
    console.log(`🔍 Validazione skill in corso...`);
    try {
      const report = await client.validate(repo.id, { ref: repo.default_branch });
      if (!report.ok) {
        console.log(`⚠️  La skill ha errori di validazione:`);
        for (const err of report.errors ?? []) {
          console.log(`   ✗ ${err.path ? err.path + ' — ' : ''}${err.message}`);
        }
        console.log(`   Importo comunque, ma ti consiglio di correggere gli errori.`);
      } else {
        console.log(`✓ Skill valida`);
      }
    } catch (e: any) {
      console.log(`⚠️  Impossibile validare: ${e.message}`);
    }

    // Importa la SKILL.md nel nuovo repo
    await client.importPaste({
      owner: config.username || '',
      skill_md: skillMd,
      name: repoName,
      visibility,
    });

    console.log(`✓ SKILL.md importata nel repository`);
    console.log(`  URL: ${config.baseUrl}/r/${repo.id}`);
  } catch (e: any) {
    console.error(`✗ Errore publish: ${e.message}`);
    process.exit(1);
  }
}

function extractNameFromFrontmatter(md: string): string | null {
  const m = md.match(/^name:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

function extractDescriptionFromFrontmatter(md: string): string | null {
  const m = md.match(/^description:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}
