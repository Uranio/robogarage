/**
 * Comando: robogarage init <nome> [--kind skill|agent|plugin]
 * Scaffolla una nuova skill locale con tutti i file richiesti da RoboGarage.
 */

import * as fs from 'fs';
import * as path from 'path';

export async function initCommand(args: string[]): Promise<void> {
  let name = '';
  let kind: 'skill' | 'agent' | 'plugin' = 'skill';

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--kind' || a === '-k') kind = (args[++i] || 'skill') as any;
    else if (!a.startsWith('-')) name = a;
  }

  if (!name) {
    console.error('✗ Specifica un nome: robogarage init mia-skill');
    process.exit(1);
  }

  if (!/^[a-z0-9-]{2,60}$/.test(name)) {
    console.error('✗ Nome non valido: 2-60 caratteri, lowercase, numeri, trattini');
    process.exit(1);
  }

  const dir = path.resolve(name);
  if (fs.existsSync(dir)) {
    console.error(`✗ La cartella ${name} esiste già`);
    process.exit(1);
  }

  const now = new Date().toISOString();

  const files: Record<string, string> = {
    'SKILL.md': `---
name: ${name}
description: Descrizione della skill ${name}
version: 0.1.0
author: $(whoami 2>/dev/null || utente)
license: MIT
compatibility: ${kind === 'plugin' ? 'claude, opencode, codex' : 'claude, opencode, pi'}
tools: [read, write, edit, bash]
---

# ${name}

> ${kind.charAt(0).toUpperCase() + kind.slice(1)} RoboGarage

## Istruzioni

1. Leggi \`references/\` per contesto lungo.
2. Usa \`scripts/\` per azioni ripetibili.
3. Controlla \`examples/\` prima di rispondere.

## Riferimenti

- [Riferimenti](references/overview.md)
- [Esempi](examples/input.md)
`,
    'README.md': `# ${name}\n\n${kind.charAt(0).toUpperCase() + kind.slice(1)} RoboGarage.\n`,
    'CHANGELOG.md': `# Changelog\n\n## 0.1.0\n- init\n`,
    'skill.json': JSON.stringify(
      { name, version: '0.1.0', author: 'utente', description: '', kind },
      null,
      2
    ),
    'references/overview.md': `# Overview\n\nContesto lungo per la skill ${name}.\n`,
    'examples/input.md': `# Esempio input\n\n\`\`\nrobogarage run owner/${name} --input "hello"\n\`\`\n`,
    'examples/expected.md': `# Output atteso\n\nRisultato gold per test di regressione.\n`,
  };

  if (kind === 'skill') {
    files['scripts/run.sh'] = `#!/bin/sh\n# Punto di ingresso eseguibile per la skill\necho "hello from $0"\n`;
    files['tests/smoke.test.sh'] = `#!/bin/sh\n# ./scripts/run.sh | grep -q hello\n`;
  }

  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, { mode: rel.endsWith('.sh') ? 0o755 : 0o644 });
  }

  console.log(`✓ Skill ${name} scaffollata in ${dir}/`);
  console.log('\nProssimi passi:');
  console.log(`  cd ${name}`);
  console.log('  robogarage publish . --visibility private --kind ' + kind);
}
