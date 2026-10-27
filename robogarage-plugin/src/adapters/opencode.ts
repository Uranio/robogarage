/**
 * Adattatore Crush (ex OpenCode, Charmbracelet).
 *
 * Crush supporta lo standard Agent Skills e cerca skill in:
 *   - $CRUSH_SKILLS_DIR
 *   - $XDG_CONFIG_HOME/agents/skills  (~/.config/agents/skills/)
 *   - $XDG_CONFIG_HOME/crush/skills   (~/.config/crush/skills/)
 *   - ~/.agents/skills/
 *   - ~/.claude/skills/
 *
 * Riferimento: https://github.com/charmbracelet/crush (sezione Agent Skills)
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

const CRUSH_SKILLS_DIRS = [
  path.join(process.env.HOME || '', '.config', 'crush', 'skills'),
  path.join(process.env.HOME || '', '.config', 'agents', 'skills'),
  path.join(process.env.HOME || '', '.agents', 'skills'),
];

export function crushSkillMarkdown(
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
compatibility: crush, opencode
tools: [read, write, edit, bash]
---

# ${name}

Skill RoboGarage per Crush (ex OpenCode).

## Configurazione

**Base URL:** \`${baseUrl}\`
**Token:** \`${token.slice(0, 8)}...\` (configurato in ~/.robogarage/config.json)

## Comandi

- \`robogarage import <skill>\`
- \`robogarage publish <cartella>\`
- \`robogarage validate <skill>\`

---`;
}

export async function installCrush(
  client: RoboGarageClient,
  skillName: string,
  description: string
): Promise<void> {
  const config = loadConfig();
  if (!config.token) throw new Error('Nessun token configurato. Esegui prima: robogarage login');

  // Usa la prima directory disponibile, creando quella principale se non esiste
  const dir = path.join(CRUSH_SKILLS_DIRS[0], skillName);
  fs.mkdirSync(dir, { recursive: true });

  const md = crushSkillMarkdown(skillName, description, config.baseUrl, config.token);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md, { mode: 0o644 });

  console.log(`✓ Skill installata in ${dir}/SKILL.md`);
  console.log(`  Crush la scoprirà automaticamente al prossimo avvio.`);
  console.log(`  Directory alternative: ${CRUSH_SKILLS_DIRS.slice(1).join(', ')}`);
}

export async function loginCrush(token: string, baseUrl?: string): Promise<void> {
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
