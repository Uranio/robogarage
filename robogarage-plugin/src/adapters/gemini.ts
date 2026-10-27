/**
 * Adattatore Gemini CLI (Google).
 *
 * Gemini supporta lo standard Agent Skills: skill in ~/.gemini/skills/<nome>/SKILL.md.
 * Non richiede file gemini-extension.json aggiuntivi per le skill base.
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

const GEMINI_SKILLS_DIR = path.join(process.env.HOME || '', '.gemini', 'skills');

export function geminiSkillMarkdown(
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
compatibility: gemini
tools: [read, write, edit, bash]
---

# ${name}

Skill RoboGarage per Gemini CLI.

## Connessione

**Base URL:** \`${baseUrl}\`
**Token:** \`${token.slice(0, 8)}...\` (configurato in ~/.robogarage/config.json)

## Operazioni

- \`robogarage import <skill>\`
- \`robogarage publish <cartella>\`
- \`robogarage validate <skill>\`

---`;
}

export async function installGemini(
  client: RoboGarageClient,
  skillName: string,
  description: string,
  projectDir: string = process.cwd()
): Promise<void> {
  const config = loadConfig();
  if (!config.token) throw new Error('Nessun token configurato. Esegui prima: robogarage login');

  const dir = path.join(GEMINI_SKILLS_DIR, skillName);
  fs.mkdirSync(dir, { recursive: true });

  const md = geminiSkillMarkdown(skillName, description, config.baseUrl, config.token);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md, { mode: 0o644 });

  console.log(`✓ Skill installata in ${dir}/SKILL.md`);
}

export async function loginGemini(token: string, baseUrl?: string): Promise<void> {
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
