/**
 * Adattatore Claude Code (Anthropic).
 *
 * Claude Code usa lo standard Agent Skills aperto (https://agentskills.io).
 * Le skill sono cartelle in ~/.claude/skills/<nome>/ con un file SKILL.md
 * contenente frontmatter YAML e istruzioni.
 *
 * Riferimento: https://code.claude.com/docs/en/skills.md
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

const CLAUDE_SKILLS_DIR = path.join(process.env.HOME || '', '.claude', 'skills');

export function claudeSkillMarkdown(
  name: string,
  description: string,
  baseUrl: string,
  token: string
): string {
  return `---
name: ${name}
description: ${description}
version: 1.0.0
author: robogarage-plugin
license: MIT
compatibility: claude
tools: [read, write, edit, bash]
---

# ${name}

Skill RoboGarage per Claude Code.

## Connessione RoboGarage

Questa skill è collegata al tuo account RoboGarage.

**Base URL:** \`${baseUrl}\`
**Token:** \`${token.slice(0, 8)}...\` (configurato in ~/.robogarage/config.json)

## Operazioni disponibili

- \`robogarage import <skill>\` — importa una skill da RoboGarage
- \`robogarage publish <cartella>\` — pubblica una skill locale su RoboGarage
- \`robogarage validate <skill>\` — valida una skill tramite l'API di RoboGarage

## Istruzioni

1. Configura il token: \`robogarage login --token <il_tuo_token> --agent claude\`
2. Lista le skill disponibili: \`robogarage list\`
3. Importa una skill: \`robogarage import owner/skill-name\`

---`;
}

export async function installClaude(
  client: RoboGarageClient,
  skillName: string,
  description: string
): Promise<void> {
  const config = loadConfig();
  if (!config.token) throw new Error('Nessun token configurato. Esegui prima: robogarage login');

  const dir = path.join(CLAUDE_SKILLS_DIR, skillName);
  fs.mkdirSync(dir, { recursive: true });

  const md = claudeSkillMarkdown(skillName, description, config.baseUrl, config.token);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md, { mode: 0o644 });

  console.log(`✓ Skill installata in ${dir}/SKILL.md`);
  console.log(`  Caricala in Claude Code con: /skill ${skillName}`);
}

export async function loginClaude(token: string, baseUrl?: string): Promise<void> {
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
