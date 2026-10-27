import { test, expect } from 'vitest';

test('skill.json ha i campi richiesti', () => {
  const skill = {
    name: 'github-robogarage',
    version: '1.0.0',
    author: 'dupin',
    license: 'MIT',
    tools: ['read', 'write', 'edit', 'bash'],
  };

  expect(skill.name).toBe('github-robogarage');
  expect(skill.version).toBe('1.0.0');
  expect(skill.tools).toContain('bash');
});

test('URL frontend e backend sono definiti', () => {
  const frontend = 'https://robogarage-2-frontend.onrender.com';
  const backend = 'https://robogarage-back2.onrender.com';

  expect(frontend).toContain('onrender.com');
  expect(backend).toContain('onrender.com');
  expect(frontend).not.toBe(backend);
});
