/**
 * Adattatore Pi coding agent.
 *
 * Pi usa skill con SKILL.md in ~/.pi/skills/<nome>/ seguendo lo standard
 * Agent Skills con frontmatter YAML.
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

const PI_SKILLS_DIR = path.join(process.env.HOME || '', '.pi', 'skills');

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

  const dir = path.join(PI_SKILLS_DIR, skillName);
  fs.mkdirSync(dir, { recursive: true });

  const md = piSkillMarkdown(skillName, description, config.baseUrl, config.token);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md, { mode: 0o644 });

  console.log(`✓ Skill installata in ${dir}/SKILL.md`);
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
