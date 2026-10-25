import { Hono } from 'hono';
import * as fs from 'fs';
import * as path from 'path';
import { db, repoPath, getRepoRow } from '../db.js';
import { git, initRepo, listBranches, logCommits, lsTree, showBlob, archive, diffRange, withRepoLock, assertRef, assertRepoPath, safeJoin } from '../git.js';
import { authed } from '../auth.js';

const app = new Hono();

// Privacy model (local-grade until JWT lands): the browser sends `x-user`.
// Public repos are visible to everyone; private ones only to the owner and
// members. Hidden repos answer 404 (never leak their existence).
export const requester = (c: any): string => authed(c)?.username || '';

// 401 unless the caller presents a valid JWT (middleware sets context).
export function needAuth(c: any) {
  if (!authed(c)) return c.json({ detail: 'sign in required' }, 401);
  return null;
}

export function isMember(repoId: number, username: string): boolean {
  if (!username) return false;
  const row = db
    .prepare('SELECT r.owner_id, u.username AS owner FROM repos r JOIN users u ON u.id=r.owner_id WHERE r.id=?')
    .get(repoId) as any;
  if (!row) return false;
  if (row.owner === username) return true;
  return !!db
    .prepare('SELECT 1 FROM collaborators c JOIN users u ON u.id=c.user_id WHERE c.repo_id=? AND u.username=?')
    .get(repoId, username);
}

export function visible(row: any, username: string): boolean {
  if (!row) return false;
  if (row.visibility !== 'private') return true;
  return isMember(row.id, username);
}

// Write access: owner or collaborator. Public visibility is NOT write access.
export function canWrite(row: any, username: string): boolean {
  return !!username && isMember(row.id, username);
}

const SKILL_TEMPLATE = (name: string, author: string, description: string) => `---
name: ${name}
description: ${description || 'An AI skill'}
version: 0.1.0
author: ${author}
license: MIT
compatibility: opencode, claude
tools: [read, bash]
---

# ${name}

> ${description || 'Describe what the skill does here.'}

## Instructions

1. Read \`references/\` for long-form context.
2. Use \`scripts/\` for repeatable actions instead of reinventing them.
3. Check \`examples/\` before answering.

## References

- [References](references/overview.md)
- [Examples](examples/input.md)
`;

const SCAFFOLD: Array<[string, string]> = [
  ['references/overview.md', '# Overview\n\nLong-form context for the skill. Move here anything over ~100 lines.\n'],
  ['examples/input.md', '# Example input\n\n```\nrobogarage run owner/name --input "hello"\n```\n'],
  ['examples/expected.md', '# Expected output\n\nGolden result for regression tests.\n'],
  ['scripts/run.sh', '#!/bin/sh\n# Executable entry-point for the skill\necho "hello from $0"\n'],
  ['tests/smoke.test.sh', '#!/bin/sh\n# ./scripts/run.sh | grep -q hello\n'],
  ['README.md', ''],
  ['CHANGELOG.md', '# Changelog\n\n## 0.1.0\n- init\n'],
  ['skill.json', ''],
];

const AGENT_TEMPLATE = (name: string, author: string, description: string) => `---
name: ${name}
description: ${description || 'What the agent does. Use when...'}
mode: subagent
model: sonnet
temperature: 0.3
color: cyan
tools: [Read, Grep, Glob, Bash]
skills: []
---

# ${name}

> ${description || 'Describe the agent mission here.'}

## Mission

State the goal, the boundaries, and what done looks like.

## Rules

1. Stay inside the allowed tools.
2. Load the listed skills before acting.
3. Report findings before changing anything.
`;

const camel = (s: string) =>
  s.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase()).replace(/^([a-z])/, (_m, c: string) => c.toUpperCase());

function installHint(target: string): string {
  switch (target) {
    case 'opencode':
      return 'Copy the .ts file into `.opencode/plugins/` or publish to npm and add it to `opencode.json`.';
    case 'codex':
      return 'Install through the Codex plugin browser.';
    case 'cursor':
      return 'Import the folder as a Cursor plugin (`.cursor-plugin/`).';
    case 'gemini':
      return 'Install with: `gemini extensions install <folder>`.';
    default:
      return 'Load with `claude --plugin-dir <folder>` or publish via a marketplace.';
  }
}

function pluginScaffold(target: string, name: string, owner: string, description: string): Array<[string, string]> {
  const readme: [string, string] = ['README.md', `# ${owner}/${name}\n\n${description}\n\n## Install\n${installHint(target)}\n`];
  const demoSkill: [string, string] = [
    `skills/${name}/SKILL.md`,
    `---\nname: ${name}\ndescription: ${description}\nversion: 0.1.0\n---\n\n# ${name}\n\n${description}\n`,
  ];
  switch (target) {
    case 'opencode':
      return [
        ['plugin.ts', `// OpenCode plugin — runs at startup from .opencode/plugins/\nexport const ${camel(name)}Plugin = async () => {\n  return {\n    'tool.execute.before': async (input: any) => {\n      // inspect or block tool calls here\n    },\n  };\n};\n`],
        ['package.json', JSON.stringify({ name, version: '0.1.0', description }, null, 2)],
        readme,
      ];
    case 'codex':
      return [demoSkill, readme];
    case 'cursor':
      return [
        ['.cursor-plugin/plugin.json', JSON.stringify({ name, version: '0.1.0', description, author: { name: owner }, license: 'MIT' }, null, 2)],
        demoSkill,
        readme,
      ];
    case 'gemini':
      return [
        ['gemini-extension.json', JSON.stringify({ name, version: '0.1.0', description }, null, 2)],
        demoSkill,
        readme,
      ];
    default:
      return [
        ['.claude-plugin/plugin.json', JSON.stringify({ name, version: '0.1.0', description, author: { name: owner }, license: 'MIT' }, null, 2)],
        demoSkill,
        [`agents/${name}.md`, `---\nname: ${name}\ndescription: ${description}\nmode: subagent\n---\n\n# ${name}\n\n${description}\n`],
        readme,
      ];
  }
}

function scaffoldFiles(kind: string, target: string, name: string, owner: string, description: string): Array<[string, string]> {
  if (kind === 'agent') {
    return [
      ['AGENT.md', AGENT_TEMPLATE(name, owner, description)],
      ['README.md', `# ${owner}/${name}\n\n${description}\n`],
      ['CHANGELOG.md', '# Changelog\n\n## 0.1.0\n- init\n'],
    ];
  }
  if (kind === 'plugin') return pluginScaffold(target, name, owner, description);
  return [
    ['SKILL.md', SKILL_TEMPLATE(name, owner, description)],
    ...SCAFFOLD.map(([p, content]): [string, string] => {
      if (p === 'README.md') return [p, `# ${owner}/${name}\n\n${description}\n`];
      if (p === 'skill.json') {
        return [p, JSON.stringify({ name, version: '0.1.0', author: owner, description }, null, 2)];
      }
      return [p, content];
    }),
  ];
}

// ---------- repos ----------
app.get('/repos', (c) => {
  const q = (c.req.query('q') || '').trim();
  const me = requester(c);
  const limit = Math.min(Math.max(Number(c.req.query('limit')) || 50, 1), 100);
  const offset = Math.max(Number(c.req.query('offset')) || 0, 0);
  const like = `%${q}%`;
  const rows = db
    .prepare(
      `SELECT r.*, u.username AS owner FROM repos r JOIN users u ON u.id=r.owner_id
       WHERE (r.visibility != 'private'
              OR u.username = ?
              OR r.id IN (SELECT cc.repo_id FROM collaborators cc JOIN users cu ON cu.id=cc.user_id WHERE cu.username = ?))
         AND (? = '' OR r.name LIKE ? OR r.description LIKE ? OR u.username LIKE ?)
       ORDER BY r.id DESC LIMIT ? OFFSET ?`,
    )
    .all(me, me, q, like, like, like, limit, offset);
  return c.json(rows);
});

app.post('/repos', async (c) => {
  const { owner, name, description, visibility, kind, plugin_target } = await c.req.json();
  const vis = visibility === 'private' ? 'private' : 'public';
  const itemKind = kind || 'skill';
  if (!['skill', 'agent', 'plugin'].includes(itemKind)) return c.json({ detail: 'kind: skill, agent or plugin' }, 400);
  const ptarget = plugin_target || 'claude';
  if (itemKind === 'plugin' && !['claude', 'opencode', 'codex', 'cursor', 'gemini'].includes(ptarget)) {
    return c.json({ detail: 'plugin_target: claude, opencode, codex, cursor or gemini' }, 400);
  }
  if (!owner || !name) return c.json({ detail: 'owner + name required' }, 400);
  const denied = needAuth(c);
  if (denied) return denied;
  if (String(owner).trim().toLowerCase() !== requester(c)) {
    return c.json({ detail: 'you can only create under your own account' }, 403);
  }
  if (!/^[a-z0-9-]{2,60}$/.test(name)) return c.json({ detail: 'name: 2-60 chars, lowercase, numbers, hyphens' }, 400);
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(owner) as any;
  if (!user) return c.json({ detail: `user ${owner} not found` }, 404);
  const dir = repoPath(owner, name);
  if (fs.existsSync(dir)) return c.json({ detail: 'repo exists' }, 409);
  try {
    db.prepare('INSERT INTO repos (owner_id, name, description, visibility, kind, plugin_target) VALUES (?, ?, ?, ?, ?, ?)')
      .run(user.id, name, description || '', vis, itemKind, itemKind === 'plugin' ? ptarget : '');
  } catch {
    return c.json({ detail: 'repo exists' }, 409);
  }
  const row = db.prepare(`SELECT r.*, u.username AS owner FROM repos r JOIN users u ON u.id=r.owner_id
    WHERE u.username=? AND r.name=?`).get(owner, name) as any;
  try {
    await initRepo(dir);
    for (const [p, content] of scaffoldFiles(itemKind, ptarget, name, owner, description || '')) {
      const full = safeJoin(dir, p);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-m', `feat: init ${itemKind} scaffold`);
  } catch (e) {
    db.prepare('DELETE FROM repos WHERE id=?').run(row.id);
    fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  }
  db.prepare('INSERT OR IGNORE INTO collaborators (repo_id, user_id, role) VALUES (?, ?, ?)').run(row.id, user.id, 'owner');
  return c.json(row, 201);
});

app.get('/repos/:id', (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  const collabs = db.prepare(`SELECT u.username, u.display_name, u.color, c.role FROM collaborators c
    JOIN users u ON u.id=c.user_id WHERE c.repo_id=?`).all(row.id);
  return c.json({ ...row, collaborators: collabs });
});

app.delete('/repos/:id', async (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  const denied = needAuth(c);
  if (denied) return denied;
  if (requester(c) !== row.owner) return c.json({ detail: 'only the owner can delete' }, 403);
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM pulls WHERE repo_id=? OR head_repo_id=?').run(row.id, row.id);
    db.prepare('DELETE FROM collaborators WHERE repo_id=?').run(row.id);
    db.prepare('DELETE FROM stars WHERE repo_id=?').run(row.id);
    db.prepare('DELETE FROM repos WHERE id=?').run(row.id);
  });
  tx();
  fs.rmSync(repoPath(row.owner, row.name), { recursive: true, force: true });
  return c.json({ ok: true });
});

// Owner-only settings: visibility + description.
app.patch('/repos/:id', async (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  const denied = needAuth(c);
  if (denied) return denied;
  if (requester(c) !== row.owner) return c.json({ detail: 'only the owner can change settings' }, 403);
  const { visibility, description } = await c.req.json();
  if (visibility !== undefined && visibility !== 'public' && visibility !== 'private') {
    return c.json({ detail: 'visibility: public or private' }, 400);
  }
  if (visibility !== undefined) db.prepare('UPDATE repos SET visibility=? WHERE id=?').run(visibility, row.id);
  if (description !== undefined) db.prepare('UPDATE repos SET description=? WHERE id=?').run(String(description).slice(0, 300), row.id);
  return c.json(getRepoRow(row.id));
});

// branches + commits + tree + blob
app.get('/repos/:id/branches', async (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  return c.json({ branches: await listBranches(repoPath(row.owner, row.name)), def: row.default_branch });
});

app.post('/repos/:id/branches', async (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  const denied = needAuth(c);
  if (denied) return denied;
  if (!canWrite(row, requester(c))) return c.json({ detail: 'not allowed to write this repo' }, 403);
  const { name, from } = await c.req.json();
  if (!name) return c.json({ detail: 'name required' }, 400);
  const branchName = assertRef(name);
  const fromRef = assertRef(from || row.default_branch);
  const dir = repoPath(row.owner, row.name);
  await withRepoLock(dir, () => git(dir, 'branch', branchName, fromRef));
  return c.json({ ok: true, name: branchName }, 201);
});

app.get('/repos/:id/commits', async (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  let branch: string;
  try {
    branch = assertRef(c.req.query('branch') || row.default_branch);
  } catch {
    return c.json({ detail: 'invalid branch' }, 400);
  }
  try {
    return c.json(await logCommits(repoPath(row.owner, row.name), branch));
  } catch {
    return c.json({ detail: 'branch not found' }, 404);
  }
});

app.get('/repos/:id/tree', async (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  const ref = assertRef(c.req.query('ref') || row.default_branch);
  const p = c.req.query('path') || '';
  if (p) assertRepoPath(p);
  return c.json({ ref, path: p, entries: await lsTree(repoPath(row.owner, row.name), ref, p) });
});

app.get('/repos/:id/blob', async (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  try {
    const ref = assertRef(c.req.query('ref') || row.default_branch);
    const p = assertRepoPath(c.req.query('path') || 'SKILL.md');
    const content = await showBlob(repoPath(row.owner, row.name), ref, p);
    return c.json({ content });
  } catch (e: any) {
    if (e.status === 400) return c.json({ detail: e.message }, 400);
    return c.json({ detail: String(e.message) }, 404);
  }
});

// One-click install into Claude / OpenCode / Codex — the "git clone" of skills:
//   curl -s <this-url> | tar -xz -C ~/.claude/skills/
app.get('/repos/:id/archive', async (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  let ref: string;
  try {
    ref = assertRef(c.req.query('ref') || row.default_branch);
  } catch {
    return c.json({ detail: 'invalid ref' }, 400);
  }
  try {
    const buf = await archive(repoPath(row.owner, row.name), ref, row.name);
    return c.body(new Uint8Array(buf), 200, {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${row.name}-${ref.replace(/[^A-Za-z0-9._-]+/g, '-')}.tar.gz"`,
    });
  } catch {
    return c.json({ detail: 'ref not found' }, 404);
  }
});

// Raw file for agents: `fetch` this URL straight from any tool's chat and the
// skill installs with one sentence. Path must stay inside the repo.
app.get('/repos/:id/raw', async (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  let ref: string;
  let p: string;
  try {
    ref = assertRef(c.req.query('ref') || row.default_branch);
    p = assertRepoPath(c.req.query('path') || 'SKILL.md');
  } catch {
    return c.json({ detail: 'invalid ref or path' }, 400);
  }
  try {
    const content = await showBlob(repoPath(row.owner, row.name), ref, p);
    const ct = p.endsWith('.json')
      ? 'application/json; charset=utf-8'
      : p.endsWith('.md')
        ? 'text/markdown; charset=utf-8'
        : 'text/plain; charset=utf-8';
    return c.body(content, 200, { 'Content-Type': ct });
  } catch {
    return c.json({ detail: 'not found' }, 404);
  }
});

// commit multi-file: {branch, message, author, files: {path: content | null}}
app.post('/repos/:id/commit', async (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  const denied = needAuth(c);
  if (denied) return denied;
  if (!canWrite(row, requester(c))) return c.json({ detail: 'not allowed to write this repo' }, 403);
  const { branch, message, files } = await c.req.json();
  if (!message || typeof message !== 'string' || message.length > 500) {
    return c.json({ detail: 'message required (max 500 chars)' }, 400);
  }
  if (!files || typeof files !== 'object') return c.json({ detail: 'files required' }, 400);
  const entries = Object.entries(files as Record<string, string | null>);
  if (entries.length === 0 || entries.length > 100) return c.json({ detail: '1-100 files per commit' }, 400);
  const target = assertRef(branch || row.default_branch);
  const dir = repoPath(row.owner, row.name);
  let total = 0;
  const prepared = entries.map(([p, content]) => {
    const filePath = assertRepoPath(p);
    if (content !== null) {
      if (typeof content !== 'string') throw Object.assign(new Error('file content must be a string'), { status: 400 });
      total += Buffer.byteLength(content);
      if (total > 5 * 1024 * 1024) throw Object.assign(new Error('commit too large (max 5 MB)'), { status: 413 });
    }
    return { filePath, content };
  });
  const hash = await withRepoLock(dir, async () => {
    await git(dir, 'checkout', target).catch(() => git(dir, 'checkout', '-b', target));
    for (const { filePath, content } of prepared) {
      const full = safeJoin(dir, filePath);
      if (content === null) {
        if (fs.existsSync(full)) fs.rmSync(full, { recursive: true, force: true });
        await git(dir, 'rm', '-r', '--cached', '--', filePath).catch(() => {});
      } else {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
        await git(dir, 'add', '--', filePath);
      }
    }
    const who = requester(c);
    await git(dir, '-c', 'user.name=' + who, '-c', 'user.email=' + who + '@local', 'commit', '-m', message, '--allow-empty');
    return git(dir, 'rev-parse', '--short', 'HEAD');
  });
  return c.json({ ok: true, hash }, 201);
});

// fork / star / collaborators
app.post('/repos/:id/fork', async (c) => {
  const denied = needAuth(c);
  if (denied) return denied;
  const me = authed(c)!;
  const src = getRepoRow(Number(c.req.param('id')));
  if (!src || !visible(src, requester(c))) return c.json({ detail: 'not found' }, 404);
  const newOwner = db.prepare('SELECT * FROM users WHERE id=?').get(me.id) as any;
  const dest = repoPath(newOwner.username, src.name);
  if (fs.existsSync(dest)) return c.json({ detail: 'fork already exists' }, 409);
  if (db.prepare('SELECT 1 FROM repos WHERE owner_id=? AND name=?').get(newOwner.id, src.name)) {
    return c.json({ detail: 'fork already exists' }, 409);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    // --no-hardlinks: a local clone must not share objects with the source,
    // otherwise gc/prune on one repo can corrupt the other.
    await git(path.dirname(dest), 'clone', '--no-hardlinks', repoPath(src.owner, src.name), dest);
  } catch {
    fs.rmSync(dest, { recursive: true, force: true });
    return c.json({ detail: 'cannot fork this repo' }, 409);
  }
  await git(dest, 'config', 'user.email', 'robogarage@local');
  await git(dest, 'config', 'user.name', 'robogarage');
  try {
    const info = db.prepare('INSERT INTO repos (owner_id, name, description, visibility, kind, plugin_target, forked_from_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(newOwner.id, src.name, src.description, src.visibility, src.kind, src.plugin_target, src.id);
    db.prepare('INSERT OR IGNORE INTO collaborators (repo_id, user_id, role) VALUES (?, ?, ?)').run(info.lastInsertRowid as number, newOwner.id, 'owner');
    return c.json(getRepoRow(info.lastInsertRowid as number), 201);
  } catch {
    fs.rmSync(dest, { recursive: true, force: true });
    return c.json({ detail: 'fork already exists' }, 409);
  }
});

app.post('/repos/:id/star', (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  const denied = needAuth(c);
  if (denied) return denied;
  const me = authed(c)!;
  const added = db.prepare('INSERT OR IGNORE INTO stars (repo_id, user_id) VALUES (?, ?)').run(row.id, me.id);
  if (added.changes) {
    // Increment instead of recomputing: old databases only have the counter,
    // so this preserves existing stars while still enforcing one per user.
    db.prepare('UPDATE repos SET stars = stars + 1 WHERE id=?').run(row.id);
  }
  return c.json(getRepoRow(row.id));
});

app.get('/repos/:id/collaborators', (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  const rows = db.prepare(`SELECT u.username, u.display_name, u.color, c.role FROM collaborators c
    JOIN users u ON u.id=c.user_id WHERE c.repo_id=?`).all(Number(c.req.param('id')));
  return c.json(rows);
});

app.post('/repos/:id/collaborators', async (c) => {
  const rid = Number(c.req.param('id'));
  const row = getRepoRow(rid);
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  const denied = needAuth(c);
  if (denied) return denied;
  if (requester(c) !== row.owner) return c.json({ detail: 'only the owner can manage members' }, 403);
  const { username, role } = await c.req.json();
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(username) as any;
  if (!u) return c.json({ detail: 'user not found' }, 404);
  db.prepare('INSERT OR REPLACE INTO collaborators (repo_id, user_id, role) VALUES (?, ?, ?)')
    .run(rid, u.id, role || 'contributor');
  return c.json({ ok: true }, 201);
});

// ---------- pulls ----------
app.get('/pulls', (c) => {
  const me = requester(c);
  const repoId = c.req.query('repo_id');
  if (repoId) {
    const repo = getRepoRow(Number(repoId));
    if (!repo || !visible(repo, me)) return c.json({ detail: 'not found' }, 404);
    return c.json(db.prepare('SELECT * FROM pulls WHERE repo_id=? ORDER BY id DESC').all(repoId));
  }
  const rows = db.prepare('SELECT * FROM pulls ORDER BY id DESC LIMIT 50').all() as any[];
  return c.json(
    rows.filter(
      (p) =>
        visible(getRepoRow(p.repo_id), me) &&
        visible(getRepoRow(p.head_repo_id), me),
    ),
  );
});

app.post('/pulls', async (c) => {
  const { repo_id, head_repo_id, head_branch, base_branch, title, body } = await c.req.json();
  if (!repo_id || !head_repo_id || !head_branch || !title) return c.json({ detail: 'missing fields' }, 400);
  const denied = needAuth(c);
  if (denied) return denied;
  const baseBranch = assertRef(base_branch || 'main');
  const headRef = assertRef(head_branch);
  const base = getRepoRow(Number(repo_id));
  const head = getRepoRow(Number(head_repo_id));
  if (!base || !head || !visible(base, requester(c)) || !visible(head, requester(c))) {
    return c.json({ detail: 'not found' }, 404);
  }
  const info = db.prepare(`INSERT INTO pulls (repo_id, head_repo_id, head_branch, base_branch, title, body, author)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(base.id, head.id, headRef, baseBranch, String(title).slice(0, 200), String(body || '').slice(0, 20000), requester(c));
  return c.json(db.prepare('SELECT * FROM pulls WHERE id=?').get(info.lastInsertRowid), 201);
});

app.post('/pulls/:id/merge', async (c) => {
  const pr = db.prepare('SELECT * FROM pulls WHERE id=?').get(c.req.param('id')) as any;
  if (!pr || pr.status !== 'open') return c.json({ detail: 'pr not open' }, 400);
  const denied = needAuth(c);
  if (denied) return denied;
  const base = getRepoRow(pr.repo_id);
  const head = getRepoRow(pr.head_repo_id);
  if (!base || !head || !visible(base, requester(c)) || !visible(head, requester(c))) {
    return c.json({ detail: 'not found' }, 404);
  }
  if (!canWrite(base, requester(c))) return c.json({ detail: 'only the owner or a member can merge' }, 403);
  const baseBranch = assertRef(pr.base_branch);
  const headBranch = assertRef(pr.head_branch);
  const baseDir = repoPath(base.owner, base.name);
  const sameRepo = pr.repo_id === pr.head_repo_id;
  try {
    await withRepoLock(baseDir, async () => {
      await git(baseDir, 'checkout', baseBranch);
      if (sameRepo) {
        await git(baseDir, 'merge', '--no-ff', headBranch, '-m', `Merge PR #${pr.id}: ${pr.title}`);
      } else {
        // cross-fork: fetch head repo branch then merge
        await git(baseDir, 'fetch', repoPath(head.owner, head.name), `${headBranch}:pr-${pr.id}`);
        await git(baseDir, 'merge', '--no-ff', `pr-${pr.id}`, '-m', `Merge PR #${pr.id}: ${pr.title}`);
        await git(baseDir, 'branch', '-D', `pr-${pr.id}`).catch(() => {});
      }
    });
    db.prepare("UPDATE pulls SET status='merged' WHERE id=?").run(pr.id);
    return c.json({ ok: true });
  } catch (e: any) {
    await git(baseDir, 'merge', '--abort').catch(() => {});
    return c.json({ detail: 'merge conflict: resolve it on the branch. ' + e.message }, 409);
  }
});

// Review a PR: unified diff of what the head branch adds. Open for public
// repos (review without an account), 404 for hidden ones.
app.get('/pulls/:id/diff', async (c) => {
  const pr = db.prepare('SELECT * FROM pulls WHERE id=?').get(c.req.param('id')) as any;
  if (!pr) return c.json({ detail: 'not found' }, 404);
  const base = getRepoRow(pr.repo_id);
  const head = getRepoRow(pr.head_repo_id);
  if (!base || !head || !visible(base, requester(c)) || !visible(head, requester(c))) {
    return c.json({ detail: 'not found' }, 404);
  }
  const baseDir = repoPath(base.owner, base.name);
  try {
    const baseBranch = assertRef(pr.base_branch);
    const headBranch = assertRef(pr.head_branch);
    return await withRepoLock(baseDir, async () => {
      await git(baseDir, 'checkout', baseBranch).catch(() => {});
      let headRef = headBranch;
      if (pr.repo_id !== pr.head_repo_id) {
        await git(baseDir, 'fetch', repoPath(head.owner, head.name), headBranch);
        headRef = 'FETCH_HEAD';
      }
      const { diff, stat, truncated } = await diffRange(baseDir, baseBranch, headRef);
      return c.json({ base: baseBranch, head: headBranch, stat, diff, truncated });
    });
  } catch (e: any) {
    return c.json({ detail: 'cannot compute diff: ' + (e.message || 'unknown') }, 409);
  }
});

export default app;
