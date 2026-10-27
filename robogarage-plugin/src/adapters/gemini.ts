/**
 * Adattatore Gemini CLI (Google).
 *
 * Gemini supporta estensioni tramite gemini-extension.json e skill
 * standard Agent Skills.
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

export function geminiExtensionJson(
  name: string,
  description: string,
  baseUrl: string,
  token: string
): string {
  return JSON.stringify(
    {
      name,
      version: '1.0.0',
      description,
      author: 'robogarage-plugin',
      license: 'MIT',
      robogarage: {
        baseUrl,
        tokenPrefix: token.slice(0, 8),
      },
      capabilities: ['skill_import', 'skill_validate', 'skill_publish'],
    },
    null,
    2
  );
}

export async function installGemini(
  client: RoboGarageClient,
  skillName: string,
  description: string,
  projectDir: string = process.cwd()
): Promise<void> {
  const config = loadConfig();
  if (!config.token) throw new Error('Nessun token configurato. Esegui prima: robogarage login');

  const extDir = path.join(projectDir, '.gemini');
  const skillsDir = path.join(extDir, 'skills', skillName);
  fs.mkdirSync(skillsDir, { recursive: true });

  // Scrive gemini-extension.json
  const extJson = geminiExtensionJson(skillName, description, config.baseUrl, config.token);
  fs.writeFileSync(path.join(extDir, 'gemini-extension.json'), extJson, { mode: 0o644 });

  // Scrive SKILL.md per la skill
  const md = `---
name: ${skillName}
description: ${description}
version: 1.0.0
author: robogarage-plugin
license: MIT
compatibility: gemini
tools: [read, write, edit, bash]
---

# ${skillName}

Skill RoboGarage per Gemini CLI.

**Base URL:** \`${config.baseUrl}\`
**Token:** \`${config.token?.slice(0, 8)}...\`

## Operazioni

- \`robogarage import <skill>\`
- \`robogarage publish <cartella>\`
- \`robogarage validate <skill>\`

---`;
  fs.writeFileSync(path.join(skillsDir, 'SKILL.md'), md, { mode: 0o644 });

  console.log(`✓ Estensione Gemini installata in ${extDir}/`);
  console.log(`  gemini-extension.json: ${path.join(extDir, 'gemini-extension.json')}`);
  console.log(`  Skill: ${path.join(skillsDir, 'SKILL.md')}`);
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
