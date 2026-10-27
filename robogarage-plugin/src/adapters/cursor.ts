/**
 * Adattatore Cursor.
 *
 * Cursor supporta lo standard Agent Skills: skill in ~/.cursor/skills/<nome>/SKILL.md.
 * Non richiede file di configurazione JSON aggiuntivi.
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

const CURSOR_SKILLS_DIR = path.join(process.env.HOME || '', '.cursor', 'skills');

export function cursorSkillMarkdown(
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
compatibility: cursor
tools: [read, write, edit, bash]
---

# ${name}

Skill RoboGarage per Cursor.

## Connessione

**Base URL:** \`${baseUrl}\`
**Token:** \`${token.slice(0, 8)}...\` (configurato in ~/.robogarage/config.json)

## Operazioni

- \`robogarage import <skill>\`
- \`robogarage publish <cartella>\`
- \`robogarage validate <skill>\`

---`;
}

export async function installCursor(
  client: RoboGarageClient,
  skillName: string,
  description: string,
  projectDir: string = process.cwd()
): Promise<void> {
  const config = loadConfig();
  if (!config.token) throw new Error('Nessun token configurato. Esegui prima: robogarage login');

  const dir = path.join(CURSOR_SKILLS_DIR, skillName);
  fs.mkdirSync(dir, { recursive: true });

  const md = cursorSkillMarkdown(skillName, description, config.baseUrl, config.token);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md, { mode: 0o644 });

  console.log(`✓ Skill installata in ${dir}/SKILL.md`);
}

export async function loginCursor(token: string, baseUrl?: string): Promise<void> {
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
