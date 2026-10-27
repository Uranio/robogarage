/**
 * Adattatore Cursor.
 *
 * Cursor supporta plugin tramite .cursor-plugin/plugin.json nella radice del progetto
 * e skill standard Agent Skills.
 */

import { RoboGarageClient } from '../client.js';
import { loadConfig, saveConfig } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

export function cursorPluginJson(
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
      skills: [
        {
          name,
          description,
          path: `./skills/${name}/SKILL.md`,
        },
      ],
      robogarage: {
        baseUrl,
        tokenPrefix: token.slice(0, 8),
      },
    },
    null,
    2
  );
}

export async function installCursor(
  client: RoboGarageClient,
  skillName: string,
  description: string,
  projectDir: string = process.cwd()
): Promise<void> {
  const config = loadConfig();
  if (!config.token) throw new Error('Nessun token configurato. Esegui prima: robogarage login');

  const pluginDir = path.join(projectDir, '.cursor-plugin');
  const skillsDir = path.join(pluginDir, 'skills', skillName);
  fs.mkdirSync(skillsDir, { recursive: true });

  // Scrive plugin.json
  const pluginJson = cursorPluginJson(skillName, description, config.baseUrl, config.token);
  fs.writeFileSync(path.join(pluginDir, 'plugin.json'), pluginJson, { mode: 0o644 });

  // Scrive SKILL.md per la skill
  const md = `---
name: ${skillName}
description: ${description}
version: 1.0.0
author: robogarage-plugin
license: MIT
compatibility: cursor
tools: [read, write, edit, bash]
---

# ${skillName}

Skill RoboGarage per Cursor.

**Base URL:** \`${config.baseUrl}\`
**Token:** \`${config.token?.slice(0, 8)}...\`

## Operazioni

- \`robogarage import <skill>\`
- \`robogarage publish <cartella>\`
- \`robogarage validate <skill>\`

---`;
  fs.writeFileSync(path.join(skillsDir, 'SKILL.md'), md, { mode: 0o644 });

  console.log(`✓ Plugin Cursor installato in ${pluginDir}/`);
  console.log(`  plugin.json: ${path.join(pluginDir, 'plugin.json')}`);
  console.log(`  Skill: ${path.join(skillsDir, 'SKILL.md')}`);
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
