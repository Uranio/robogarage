/**
 * Comando: robogarage validate <owner/skill> [--ref <branch>] [--target <claude|crush|codex|cursor|gemini>]
 * Chiama l'endpoint di validazione di RoboGarage su una skill.
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig } from '../config.js';

const VALID_TARGETS = ['claude', 'crush', 'codex', 'cursor', 'gemini'];

export async function validateCommand(args: string[]): Promise<void> {
  const config = loadConfig();
  if (!config.token) {
    console.error('✗ Nessun token. Esegui: robogarage login --token <token>');
    process.exit(1);
  }

  let target = '';
  let ref: string | undefined;
  let agentTarget: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--ref' || a === '-b') ref = args[++i] || undefined;
    else if (a === '--target' || a === '-t') agentTarget = (args[++i] || '') as any;
    else if (!a.startsWith('-')) target = a;
  }

  if (!target) {
    console.error('✗ Specifica la skill: robogarage validate owner/skill-name');
    process.exit(1);
  }

  const [owner, skillName] = target.split('/');
  if (!owner || !skillName) {
    console.error('✗ Formato non valido. Usa: robogarage validate owner/skill-name');
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

    if (agentTarget && !VALID_TARGETS.includes(agentTarget)) {
      console.error(`✗ Target non valido: ${agentTarget}. Usa uno di: ${VALID_TARGETS.join(', ')}`);
      process.exit(1);
    }

    const report = await client.validate(repo.id, {
      ref,
      target: agentTarget,
    });

    if (report.ok) {
      console.log(`✓ Skill ${owner}/${skillName} valida`);
      console.log(`  Tipo: ${report.kind ?? repo.kind} | File: ${report.files ?? 'n/d'}`);
    } else {
      console.log(`✗ Skill ${owner}/${skillName} NON valida`);
      for (const err of report.errors ?? []) {
        console.log(`   ✗ ${err.path ? err.path + ' — ' : ''}${err.message}`);
      }
      for (const warn of report.warnings ?? []) {
        console.log(`   ! ${warn.path ? warn.path + ' — ' : ''}${warn.message}`);
      }
      process.exit(1);
    }
  } catch (e: any) {
    console.error(`✗ Errore validazione: ${e.message}`);
    process.exit(1);
  }
}
