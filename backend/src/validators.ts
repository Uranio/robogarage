import { git } from './git.js';
import { parseFrontmatter } from './frontmatter.js';

// ---------------------------------------------------------------------------
// RoboGarage validator — our own `plugin validate`, per item kind and target.
//
// Specs implemented (researched Oct 2026):
// - skill:  SKILL.md + name/description frontmatter (open Agent Skills std)
// - agent:  canonical AGENT.md (name/description/mode/model/tools/body);
//           compatible with Claude subagents (~/.claude/agents) and OpenCode
//           agents (~/.config/opencode/agents)
// - plugin/claude:  `.claude-plugin/plugin.json` (`name` required, kebab-case)
//           + skills/ commands/ agents/ hooks/ .mcp.json components
// - plugin/opencode: JS/TS module exporting hook functions (no manifest)
// - plugin/codex:   no public manifest — a bundle is valid when it carries
//           ≥1 valid skill (+ optional MCP config / assets)
// - plugin/cursor:  `.cursor-plugin/plugin.json` (`name` required)
// - plugin/gemini:  `gemini-extension.json` (`name` required, best-effort)
// ---------------------------------------------------------------------------

export interface Finding {
  path: string;
  message: string;
}
export interface Report {
  ok: boolean;
  errors: Finding[];
  warnings: Finding[];
}

const err = (path: string, message: string): Finding => ({ path, message });
const empty = (): Report => ({ ok: true, errors: [], warnings: [] });
function finish(r: Report): Report {
  r.ok = r.errors.length === 0;
  return r;
}

const KEBAB = /^[a-z0-9-]+$/;
const AGENT_NAME = /^[a-z0-9-]{1,64}$/;

// Read a repo tree at a ref into memory (caps keep million-file repos safe).
export async function collectFiles(
  dir: string,
  ref: string,
): Promise<{ files: Map<string, string>; truncated: boolean }> {
  const files = new Map<string, string>();
  const out = await git(dir, 'ls-tree', '-r', '--name-only', '-z', ref).catch(() => '');
  const names = out.split('\0').filter(Boolean);
  let truncated = false;
  let total = 0;
  for (const name of names.slice(0, 300)) {
    if (name.includes('..')) continue;
    const content = await git(dir, 'show', `${ref}:${name}`).catch(() => null);
    if (content === null || content.includes('\0')) continue; // missing / binary
    if (content.length > 1024 * 1024 || total + content.length > 5 * 1024 * 1024) {
      truncated = true;
      continue;
    }
    total += content.length;
    files.set(name, content);
  }
  if (names.length > 300) truncated = true;
  return { files, truncated };
}

function checkFrontmatter(path: string, content: string, r: Report): Record<string, string> {
  if (!content.startsWith('---')) {
    r.errors.push(err(path, 'missing YAML frontmatter (--- block at the top)'));
    return {};
  }
  return parseFrontmatter(content);
}

// ---------------- skill ----------------

export function validateSkill(files: Map<string, string>, root = ''): Report {
  const r = empty();
  const at = (p: string) => (root ? `${root}/${p}` : p);
  const md = files.get(at('SKILL.md'));
  if (md === undefined) {
    r.errors.push(err(at('SKILL.md'), 'missing SKILL.md'));
    return finish(r);
  }
  const fm = checkFrontmatter(at('SKILL.md'), md, r);
  if (!fm.name) r.errors.push(err(at('SKILL.md'), 'frontmatter needs `name`'));
  else if (!AGENT_NAME.test(fm.name)) r.errors.push(err(at('SKILL.md'), '`name`: lowercase, numbers, hyphens, ≤64 chars'));
  if (!fm.description) r.errors.push(err(at('SKILL.md'), 'frontmatter needs `description`'));
  else if (fm.description.length > 1024) r.warnings.push(err(at('SKILL.md'), '`description` over 1024 chars may be truncated by tools'));
  const folder = root.split('/').pop() || '';
  if (fm.name && folder && fm.name !== folder) {
    r.warnings.push(err(at('SKILL.md'), `\`name\` (${fm.name}) should match the folder (${folder})`));
  }
  const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  if (body.trim().length < 20) r.errors.push(err(at('SKILL.md'), 'body is empty — write the instructions'));
  if (body.split('\n').length > 500) r.warnings.push(err(at('SKILL.md'), 'over 500 lines — move details to references/'));
  for (const m of body.matchAll(/(?:scripts|references|assets)\/[\w@.\-]+/g)) {
    if (!files.has(at(m[0])) && ![...files.keys()].some((k) => k.startsWith(at(m[0].split('/')[0] + '/')))) {
      r.warnings.push(err(at('SKILL.md'), `references \`${m[0]}\` but it is not in the repo`));
    }
  }
  return finish(r);
}

// ---------------- agent ----------------

const AGENT_MODES = ['primary', 'subagent', 'all'];

export function validateAgent(files: Map<string, string>, root = '', file = 'AGENT.md'): Report {
  const r = empty();
  const at = (p: string) => (root ? `${root}/${p}` : p);
  const AFP = at(file);
  const md = files.get(AFP);
  if (md === undefined) {
    r.errors.push(err(AFP, `missing ${file}`));
    return finish(r);
  }
  const fm = checkFrontmatter(AFP, md, r);
  if (!fm.name) r.errors.push(err(AFP, 'frontmatter needs `name`'));
  else {
    if (!AGENT_NAME.test(fm.name)) r.errors.push(err(AFP, '`name`: lowercase, numbers, hyphens, ≤64 chars'));
    if (fm.name.includes(':')) r.errors.push(err(AFP, '`name` must not contain `:` (reserved by Claude for plugin scopes)'));
  }
  if (!fm.description) r.errors.push(err(AFP, 'frontmatter needs `description` (tells the main agent when to delegate)'));
  if (fm.mode && !AGENT_MODES.includes(fm.mode)) {
    r.errors.push(err(AFP, `\`mode\` must be one of ${AGENT_MODES.join(', ')}`));
  }
  if (!fm.mode) r.warnings.push(err(AFP, 'no `mode` — Claude and OpenCode default differently; set primary|subagent|all'));
  if (fm.temperature !== undefined) {
    const t = Number(fm.temperature);
    if (Number.isNaN(t) || t < 0 || t > 2) r.errors.push(err(AFP, '`temperature` must be a number 0–2'));
  }
  if (fm.tools !== undefined) {
    const okArray = /^\[.*\]$/.test(fm.tools) || fm.tools.includes(',');
    if (!okArray && fm.tools.length > 0) r.warnings.push(err(AFP, '`tools` should be a list like [Read, Grep, Bash]'));
  }
  if (fm.color !== undefined && !/^(#[0-9a-fA-F]{6}|[a-z]+)$/.test(fm.color)) {
    r.warnings.push(err(AFP, '`color`: named color (Claude) or #rrggbb (OpenCode)'));
  }
  const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  if (body.trim().length < 20) r.errors.push(err(AFP, 'body is empty — it becomes the system prompt'));
  return finish(r);
}

// ---------------- plugin ----------------

export type PluginTarget = 'claude' | 'opencode' | 'codex' | 'cursor' | 'gemini' | 'generic';

const KNOWN_MANIFEST_KEYS = new Set([
  '$schema', 'name', 'displayName', 'version', 'description', 'author', 'homepage',
  'repository', 'license', 'keywords', 'metadata', 'icon', 'defaultEnabled',
  'dependencies', 'settings', 'userConfig', 'skills', 'commands', 'agents',
  'hooks', 'mcpServers', 'outputStyles', 'lspServers', 'workflows', 'experimental',
  'documentationUrl', 'supportUrl', 'privacyPolicyUrl', 'termsOfServiceUrl',
]);

function asJson(path: string, content: string, r: Report): any {
  try {
    return JSON.parse(content);
  } catch {
    r.errors.push(err(path, 'invalid JSON'));
    return undefined;
  }
}

function subdirHas(files: Map<string, string>, dir: string, suffix: string): string[] {
  const prefix = dir.endsWith('/') ? dir : dir + '/';
  return [...files.keys()].filter((k) => k.startsWith(prefix) && k.endsWith(suffix));
}

function mergeInto(r: Report, sub: Report) {
  r.errors.push(...sub.errors);
  r.warnings.push(...sub.warnings);
}

export function validatePlugin(files: Map<string, string>, target: PluginTarget = 'generic'): Report {
  const r = empty();
  if (target === 'claude') validateClaudePlugin(files, r);
  else if (target === 'opencode') validateOpencodePlugin(files, r);
  else if (target === 'codex') validateCodexPlugin(files, r);
  else if (target === 'cursor') validateCursorPlugin(files, r);
  else if (target === 'gemini') validateGeminiPlugin(files, r);
  else validateGenericPlugin(files, r);
  return finish(r);
}

function validateClaudePlugin(files: Map<string, string>, r: Report) {
  const manifestRaw = files.get('.claude-plugin/plugin.json');
  if (manifestRaw === undefined) {
    r.warnings.push(err('.claude-plugin/plugin.json', 'no manifest — Claude auto-discovers components, name comes from the folder'));
  } else {
    const m = asJson('.claude-plugin/plugin.json', manifestRaw, r);
    if (m) {
      if (!m.name) r.errors.push(err('.claude-plugin/plugin.json', '`name` is required'));
      else if (!KEBAB.test(m.name)) r.errors.push(err('.claude-plugin/plugin.json', '`name` must be kebab-case'));
      if (m.author !== undefined && !m.author?.name) r.errors.push(err('.claude-plugin/plugin.json', '`author.name` is required when `author` is set'));
      if (m.homepage !== undefined) {
        try {
          new URL(m.homepage);
        } catch {
          r.errors.push(err('.claude-plugin/plugin.json', '`homepage` must parse as a URL'));
        }
      }
      for (const k of Object.keys(m)) {
        if (!KNOWN_MANIFEST_KEYS.has(k)) r.warnings.push(err('.claude-plugin/plugin.json', `unknown field \`${k}\` (typo?)`));
      }
    }
  }
  let components = 0;
  const skillDirs = new Set([...files.keys()].filter((k) => k === 'skills/' || k.startsWith('skills/')).map((k) => k.split('/').slice(0, 2).join('/')));
  for (const d of skillDirs) {
    if (files.has(`${d}/SKILL.md`)) {
      components++;
      const sub = validateSkill(files, d);
      sub.errors.forEach((e) => r.errors.push(e));
      sub.warnings.forEach((w) => r.warnings.push(w));
    }
  }
  if (files.has('SKILL.md') && ![...skillDirs].some((d) => files.has(`${d}/SKILL.md`))) {
    components++;
    mergeInto(r, validateSkill(files));
  }
  components += subdirHas(files, 'commands', '.md').length;
  for (const a of subdirHas(files, 'agents', '.md')) {
    components++;
    const parts = a.split('/');
    mergeInto(r, validateAgent(files, parts.slice(0, -1).join('/'), parts[parts.length - 1]));
  }
  for (const hk of ['hooks/hooks.json', '.mcp.json', '.lsp.json', 'settings.json']) {
    if (files.has(hk)) {
      components++;
      asJson(hk, files.get(hk)!, r);
    }
  }
  if (subdirHas(files, 'output-styles', '.md').length) components++;
  if (components === 0) r.errors.push(err('.', 'no recognizable component (skills/, commands/, agents/, hooks/, .mcp.json…)'));
}

const HOOK_HINT = /(tool\.|event|session\.|command\.|permission\.|tui\.|config\s*\(|async\s*\(|\breturn\s*\{)/;

function validateOpencodePlugin(files: Map<string, string>, r: Report) {
  const entries = [...files.keys()].filter((k) => /^[^\/.][^/]*\.(ts|js)$/.test(k) || /^plugin\/[^\/.][^/]*\.(ts|js)$/.test(k));
  if (entries.length === 0) {
    r.errors.push(err('.', 'no plugin entry — add a .ts/.js module at the root or in plugin/ exporting hook functions'));
    return;
  }
  for (const e of entries) {
    const src = files.get(e)!;
    if (!/export\s+(default|const|async function|function)/.test(src)) {
      r.errors.push(err(e, 'does not export a plugin function'));
    } else if (!HOOK_HINT.test(src)) {
      r.warnings.push(err(e, 'no recognizable hooks or tools (tool.*, session.*, command.*, …)'));
    }
  }
  if (files.has('package.json')) asJson('package.json', files.get('package.json')!, r);
}

function validateCodexPlugin(files: Map<string, string>, r: Report) {
  // Codex publishes no local manifest: a plugin is a bundle of ≥1 valid skill.
  const roots = new Set<string>();
  for (const k of files.keys()) {
    if (k === 'SKILL.md') roots.add('');
    const m = k.match(/^(skills\/[^/]+)\/SKILL\.md$/);
    if (m) roots.add(m[1]);
  }
  if (roots.size === 0) {
    r.errors.push(err('.', 'Codex plugins distribute skills: no valid SKILL.md found (root or skills/*/)'));
    return;
  }
  for (const root of roots) mergeInto(r, validateSkill(files, root));
  for (const m of ['mcp.json', '.mcp.json']) {
    if (files.has(m)) asJson(m, files.get(m)!, r);
  }
}

function validateCursorPlugin(files: Map<string, string>, r: Report) {
  const manifestRaw = files.get('.cursor-plugin/plugin.json');
  if (manifestRaw === undefined) {
    r.errors.push(err('.cursor-plugin/plugin.json', 'missing manifest (Cursor plugins need name + components)'));
  } else {
    const m = asJson('.cursor-plugin/plugin.json', manifestRaw, r);
    if (m && !m.name) r.errors.push(err('.cursor-plugin/plugin.json', '`name` is required'));
    else if (m && !KEBAB.test(m.name)) r.errors.push(err('.cursor-plugin/plugin.json', '`name` must be kebab-case'));
  }
  let components = 0;
  for (const k of files.keys()) {
    const m = k.match(/^(skills\/[^/]+)\/SKILL\.md$/);
    if (m) {
      components++;
      mergeInto(r, validateSkill(files, m[1]));
    }
  }
  components += subdirHas(files, 'agents', '.md').length + subdirHas(files, 'commands', '.md').length;
  if (files.has('.cursor-plugin/marketplace.json')) {
    const mp = asJson('.cursor-plugin/marketplace.json', files.get('.cursor-plugin/marketplace.json')!, r);
    if (mp) {
      if (!mp.name || !mp.owner || !Array.isArray(mp.plugins)) {
        r.errors.push(err('.cursor-plugin/marketplace.json', 'needs `name`, `owner` and `plugins[]`'));
      } else {
        for (const [i, p] of mp.plugins.entries()) {
          if (!p?.name || !p?.source) r.errors.push(err('.cursor-plugin/marketplace.json', `plugins[${i}] needs \`name\` + \`source\``));
        }
      }
    }
  }
  if (components === 0 && manifestRaw !== undefined) {
    r.warnings.push(err('.', 'manifest found but no skills/agents/commands yet'));
  }
}

function validateGeminiPlugin(files: Map<string, string>, r: Report) {
  const extRaw = files.get('gemini-extension.json');
  if (extRaw === undefined) {
    r.errors.push(err('gemini-extension.json', 'missing extension manifest'));
  } else {
    const m = asJson('gemini-extension.json', extRaw, r);
    if (m) {
      if (!m.name) r.errors.push(err('gemini-extension.json', '`name` is required'));
      if (!m.version) r.warnings.push(err('gemini-extension.json', 'add a `version` so users get updates'));
    }
  }
  if (!files.has('GEMINI.md')) r.warnings.push(err('GEMINI.md', 'recommended — project context for the extension'));
  for (const k of files.keys()) {
    const m = k.match(/^(skills\/[^/]+)\/SKILL\.md$/);
    if (m) mergeInto(r, validateSkill(files, m[1]));
  }
}

function validateGenericPlugin(files: Map<string, string>, r: Report) {
  const signals = [
    files.has('.claude-plugin/plugin.json'),
    files.has('.cursor-plugin/plugin.json'),
    files.has('gemini-extension.json'),
    files.has('SKILL.md'),
    [...files.keys()].some((k) => /^skills\/[^/]+\/SKILL\.md$/.test(k)),
    [...files.keys()].some((k) => /^[^\/.][^/]*\.(ts|js)$/.test(k)),
  ];
  if (!signals.some(Boolean)) r.errors.push(err('.', 'no recognizable plugin structure (manifest, skills/, or plugin module)'));
  else r.warnings.push(err('.', 'generic check only — pick a target (claude, opencode, codex, cursor, gemini) for full validation'));
}
