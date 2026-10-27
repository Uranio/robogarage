/**
 * Adattatore Pi coding agent.
 *
 * Pi supporta lo standard Agent Skills e legge skill da:
 *   - ~/.agents/skills/ (store condiviso, usato anche dal CLI skills)
 *   - ~/.pi/agent/skills/ (directory locale Pi)
 *
 * Le skill sono SKILL.md con frontmatter YAML, seguendo lo standard Agent Skills.
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

const PI_SKILLS_DIRS = [
  path.join(process.env.HOME || '', '.agents', 'skills'),
  path.join(process.env.HOME || '', '.pi', 'agent', 'skills'),
];

export function piSkillMarkdown(
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
compatibility: pi
tools: [read, write, edit, bash]
---

# ${name}

Skill RoboGarage per Pi coding agent.

## Connessione

**Base URL:** \`${baseUrl}\`
**Token:** \`${token.slice(0, 8)}...\` (configurato in ~/.robogarage/config.json)

## Operazioni

Usa il comando \`robogarage\` da terminale per importare, pubblicare e validare skill su RoboGarage.

---`;
}

export async function installPi(
  client: RoboGarageClient,
  skillName: string,
  description: string
): Promise<void> {
  const config = loadConfig();
  if (!config.token) throw new Error('Nessun token configurato. Esegui prima: robogarage login');

  const dir = path.join(PI_SKILLS_DIRS[0], skillName);
  fs.mkdirSync(dir, { recursive: true });

  const md = piSkillMarkdown(skillName, description, config.baseUrl, config.token);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md, { mode: 0o644 });

  console.log(`✓ Skill installata in ${dir}/SKILL.md`);
  console.log(`  Directory alternative: ${PI_SKILLS_DIRS.slice(1).join(', ')}`);
}

export async function loginPi(token: string, baseUrl?: string): Promise<void> {
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
