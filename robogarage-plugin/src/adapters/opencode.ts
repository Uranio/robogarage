/**
 * Adattatore OpenCode / Crush (Charmbracelet).
 *
 * OpenCode è diventato Crush (charmbracelet/crush). Supporta skill in
 * ~/.config/opencode/skills/<nome>/SKILL.md e estensione tramite MCP
 * (http, stdio, sse).
 *
 * Riferimento: https://github.com/charmbracelet/crush
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

const OPENCODE_SKILLS_DIR = path.join(
  process.env.HOME || '',
  '.config',
  'opencode',
  'skills'
);

export function opencodeSkillMarkdown(
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
compatibility: opencode
tools: [read, write, edit, bash]
---

# ${name}

Skill RoboGarage per OpenCode / Crush.

## Configurazione

**Base URL:** \`${baseUrl}\`
**Token:** \`${token.slice(0, 8)}...\` (configurato in ~/.robogarage/config.json)

## Comandi

- \`robogarage import <skill>\`
- \`robogarage publish <cartella>\`
- \`robogarage validate <skill>\`

---`;
}

export async function installOpenCode(
  client: RoboGarageClient,
  skillName: string,
  description: string
): Promise<void> {
  const config = loadConfig();
  if (!config.token) throw new Error('Nessun token configurato. Esegui prima: robogarage login');

  const dir = path.join(OPENCODE_SKILLS_DIR, skillName);
  fs.mkdirSync(dir, { recursive: true });

  const md = opencodeSkillMarkdown(skillName, description, config.baseUrl, config.token);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md, { mode: 0o644 });

  console.log(`✓ Skill installata in ${dir}/SKILL.md`);
}

export async function loginOpenCode(token: string, baseUrl?: string): Promise<void> {
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
