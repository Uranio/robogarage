import { describe, it, expect } from 'vitest';
import { validateSkill, validateAgent, validatePlugin, Finding } from './validators.js';
import { parseFrontmatter, slugify } from './frontmatter.js';

const files = (entries: Array<[string, string]>) => new Map<string, string>(entries);

const GOOD_SKILL = `---
name: web-scraper
description: Extracts data from web pages
version: 0.1.0
---

# Web Scraper

Follow the instructions carefully to extract clean markdown from any page.
`;

const GOOD_AGENT = `---
name: reviewer
description: Reviews code changes. Use when asked for a review.
mode: subagent
model: sonnet
temperature: 0.3
color: cyan
tools: [Read, Grep, Bash]
---

# Reviewer

You review code changes for correctness and regressions.
`;

describe('parseFrontmatter', () => {
  it('parses key: value pairs, lowercases keys', () => {
    expect(parseFrontmatter(GOOD_SKILL)).toMatchObject({ name: 'web-scraper', version: '0.1.0' });
  });
  it('returns {} without a frontmatter block', () => {
    expect(parseFrontmatter('# no frontmatter')).toEqual({});
  });
});

describe('slugify', () => {
  it('kebab-cases names', () => {
    expect(slugify('My Cool Skill!')).toBe('my-cool-skill');
    expect(slugify('')).toBe('imported-skill');
  });
});

describe('validateSkill', () => {
  it('passes a good skill', () => {
    const r = validateSkill(files([['SKILL.md', GOOD_SKILL]]));
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });
  it('fails without SKILL.md', () => {
    const r = validateSkill(files([]));
    expect(r.ok).toBe(false);
    expect(r.errors[0].path).toBe('SKILL.md');
  });
  it('fails without name/description', () => {
    const r = validateSkill(files([['SKILL.md', '---\nversion: 1\n---\n\nBody text here, long enough to pass the body check.']]));
    expect(r.errors.map((e: Finding) => e.message)).toContain('frontmatter needs `name`');
    expect(r.errors.map((e: Finding) => e.message)).toContain('frontmatter needs `description`');
  });
  it('warns on folder mismatch', () => {
    const r = validateSkill(files([['other-name/SKILL.md', GOOD_SKILL]]), 'other-name');
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w: Finding) => w.message.includes('should match the folder'))).toBe(true);
  });
});

describe('validateAgent', () => {
  it('passes a good agent', () => {
    const r = validateAgent(files([['AGENT.md', GOOD_AGENT]]));
    expect(r.ok).toBe(true);
  });
  it('rejects colons in name and bad temperature', () => {
    const bad = GOOD_AGENT.replace('name: reviewer', 'name: scope:reviewer').replace('temperature: 0.3', 'temperature: 9');
    const r = validateAgent(files([['AGENT.md', bad]]));
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
  it('warns when mode is missing', () => {
    const noMode = GOOD_AGENT.split('\n').filter((l) => !l.startsWith('mode:')).join('\n');
    const r = validateAgent(files([['AGENT.md', noMode]]));
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w: Finding) => w.message.includes('no `mode`'))).toBe(true);
  });
});

describe('validatePlugin', () => {
  const manifest = JSON.stringify({ name: 'deploy-help', version: '0.1.0', description: 'd', author: { name: 'neo' } });
  it('passes a clean claude plugin (manifest + skill + agent)', () => {
    const r = validatePlugin(
      files([
        ['.claude-plugin/plugin.json', manifest],
        ['skills/deploy/SKILL.md', GOOD_SKILL.replace('web-scraper', 'deploy')],
        ['agents/deployer.md', GOOD_AGENT.replace('reviewer', 'deployer').replace('Reviews code changes. Use when asked for a review.', 'Deploys things.')],
      ]),
      'claude',
    );
    expect(r.errors).toEqual([]);
  });
  it('catches bad manifest JSON and skill without frontmatter', () => {
    const r = validatePlugin(
      files([
        ['.claude-plugin/plugin.json', '{oops'],
        ['skills/broken/SKILL.md', 'just prose, long enough to count as a body for the test'],
      ]),
      'claude',
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e: Finding) => e.message === 'invalid JSON')).toBe(true);
  });
  it('requires a plugin entry for opencode', () => {
    const r = validatePlugin(files([['README.md', '# hi']]), 'opencode');
    expect(r.ok).toBe(false);
  });
  it('accepts a hook-exporting opencode module', () => {
    const r = validatePlugin(
      files([['plugin.ts', `export const P = async () => ({ 'tool.execute.before': async () => {} });`]]),
      'opencode',
    );
    expect(r.ok).toBe(true);
  });
  it('treats codex plugins as skill bundles', () => {
    expect(validatePlugin(files([]), 'codex').ok).toBe(false);
    expect(validatePlugin(files([['skills/a/SKILL.md', GOOD_SKILL.replace('web-scraper', 'a')]]), 'codex').ok).toBe(true);
  });
  it('requires name in gemini-extension.json', () => {
    const r = validatePlugin(files([['gemini-extension.json', JSON.stringify({ version: '1' })]]), 'gemini');
    expect(r.errors.some((e: Finding) => e.message.includes('`name`'))).toBe(true);
  });
});
