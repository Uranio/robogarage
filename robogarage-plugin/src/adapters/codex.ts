/**
 * Adattatore Codex CLI (OpenAI).
 *
 * Codex usa lo standard Agent Skills: cartelle in ~/.codex/skills/<nome>/
 * con un file SKILL.md contenente frontmatter YAML e istruzioni.
 * Non usa plugin TypeScript hook: ogni skill è una directory autonoma.
 *
 * Riferimento: https://github.com/wenhaochai/codex-plugins (layout plugins/<plugin>/skills/<skill>/SKILL.md)
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

const CODEX_SKILLS_DIR = path.join(process.env.HOME || '', '.codex', 'skills');

export function codexSkillMarkdown(
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
compatibility: codex
tools: [read, write, edit, bash]
---

# ${name}

Skill RoboGarage per Codex CLI.

## Connessione RoboGarage

Questa skill è collegata al tuo account RoboGarage.

**Base URL:** \`${baseUrl}\`
**Token:** \`${token.slice(0, 8)}...\` (configurato in ~/.robogarage/config.json)

## Operazioni disponibili

Usa il comando \`robogarage\` da terminale per importare, pubblicare e validare skill su RoboGarage:

- \`robogarage import <skill>\` — importa una skill da RoboGarage
- \`robogarage publish <cartella>\` — pubblica una skill locale su RoboGarage
- \`robogarage validate <skill>\` — valida una skill tramite l'API di RoboGarage

---`;
}

export async function installCodex(
  client: RoboGarageClient,
  skillName: string,
  description: string
): Promise<void> {
  const config = loadConfig();
  if (!config.token) throw new Error('Nessun token configurato. Esegui prima: robogarage login');

  const dir = path.join(CODEX_SKILLS_DIR, skillName);
  fs.mkdirSync(dir, { recursive: true });

  const md = codexSkillMarkdown(skillName, description, config.baseUrl, config.token);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md, { mode: 0o644 });

  console.log(`✓ Skill installata in ${dir}/SKILL.md`);
  console.log(`  Codex la scoprirà automaticamente al prossimo avvio.`);
}

export async function loginCodex(token: string, baseUrl?: string): Promise<void> {
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
