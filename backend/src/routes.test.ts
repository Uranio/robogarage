import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const BACKEND_DIR = fileURLToPath(new URL('..', import.meta.url));
const Database = createRequire(import.meta.url)('better-sqlite3');

// Integration tests: boots a real backend on a temp DATA_DIR and exercises
// the critical routes (auth, privacy, authz, import allowlist, validate, PR diff).
const PORT = 8931;
const BASE = `http://localhost:${PORT}`;
const ADMIN = 'test-admin-token';
let proc: ChildProcess | null = null;
let tmp = '';
let testerToken = '';

async function waitForHealth(tries = 60): Promise<void> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('test backend never came up');
}

async function api(method: string, p: string, body?: any, token?: string, headers?: Record<string, string>) {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...(headers || {}) };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const r = await fetch(BASE + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'robogarage-test-'));
  const demo = path.join(tmp, 'imports', 'demo');
  fs.mkdirSync(demo, { recursive: true });
  fs.writeFileSync(
    path.join(demo, 'SKILL.md'),
    '---\nname: imported-demo\ndescription: Demo import\n---\n\n# Demo\n\nDo the demo thing carefully.\n',
  );
  proc = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: tmp,
      JWT_SECRET: 'test-secret-0123456789abcdef0123456789abcdef',
      ADMIN_TOKEN: ADMIN,
      IMPORT_ROOTS: path.join(tmp, 'imports'),
      NODE_ENV: 'test',
    },
    stdio: 'ignore',
  });
  await waitForHealth();
}, 60000);

afterAll(() => {
  proc?.kill();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('auth + privacy', () => {
  let privId = 0;

  it('registers with token, without hash or email in the response', async () => {
    const { status, data } = await api('POST', '/api/users', {
      username: 'tester', email: 'tester@example.com', password: 'secret12',
    });
    expect(status).toBe(201);
    expect(data.token).toBeTruthy();
    expect(data.password_hash).toBeUndefined();
    expect(data.email).toBeUndefined();
    testerToken = data.token;
  });

  it('rejects anonymous writes', async () => {
    const { status } = await api('POST', '/api/repos', { owner: 'tester', name: 'x', description: 'x' });
    expect(status).toBe(401);
  });

  it('creates a private repo and hides it from strangers', async () => {
    const created = await api('POST', '/api/repos', {
      owner: 'tester', name: 'secret', description: 'shh', visibility: 'private',
    }, testerToken);
    expect(created.status).toBe(201);
    privId = created.data.id;
    const anon = await api('GET', `/api/repos/${privId}`);
    expect(anon.status).toBe(404);
    const mine = await api('GET', `/api/repos/${privId}`, undefined, testerToken);
    expect(mine.status).toBe(200);
  });

  it('derives commit authorship from the token', async () => {
    const c = await api('POST', `/api/repos/${privId}/commit`, {
      branch: 'main', message: 'hi', author: 'mallory', files: { 'a.txt': 'hi' },
    }, testerToken);
    expect(c.status).toBe(201);
    const log = await api('GET', `/api/repos/${privId}/commits?branch=main`, undefined, testerToken);
    expect(log.data[0].author).toBe('tester');
  });
});

describe('public user list', () => {
  it('never exposes emails', async () => {
    const { status, data } = await api('GET', '/api/users');
    expect(status).toBe(200);
    const tester = data.find((u: any) => u.username === 'tester');
    expect(tester).toBeTruthy();
    expect(tester.email).toBeUndefined();
    expect(data.every((u: any) => !('email' in u))).toBe(true);
  });
});

describe('legacy password bootstrap', () => {
  it('requires the admin token', async () => {
    expect((await api('POST', '/api/users/password', { username: 'neo', password: 'neopass123' })).status).toBe(403);
    expect((await api('POST', '/api/users/password', { username: 'neo', password: 'neopass123' }, undefined, {
      'x-admin-token': 'wrong',
    })).status).toBe(403);
  });

  it('sets a first password only with the admin token, then refuses reuse', async () => {
    expect((await api('POST', '/api/users/password', { username: 'neo', password: 'short' }, undefined, {
      'x-admin-token': ADMIN,
    })).status).toBe(400);
    expect((await api('POST', '/api/users/password', { username: 'neo', password: 'neopass123' }, undefined, {
      'x-admin-token': ADMIN,
    })).status).toBe(200);
    expect((await api('POST', '/api/users/password', { username: 'neo', password: 'otherpass1' }, undefined, {
      'x-admin-token': ADMIN,
    })).status).toBe(409);
    const login = await api('POST', '/api/login', { username: 'neo', password: 'neopass123' });
    expect(login.status).toBe(200);
  });
});

describe('import allowlist', () => {
  it('refuses paths outside IMPORT_ROOTS', async () => {
    const r = await api('POST', '/api/import', {
      owner: 'tester', source_path: '/etc', visibility: 'private',
    }, testerToken);
    expect(r.status).toBe(403);
  });

  it('refuses internal data directories', async () => {
    const r = await api('POST', '/api/import', {
      owner: 'tester', source_path: path.join(tmp, 'repos'), visibility: 'private',
    }, testerToken);
    expect(r.status).toBe(403);
  });

  it('imports a folder inside the allowlist', async () => {
    const r = await api('POST', '/api/import', {
      owner: 'tester', source_path: path.join(tmp, 'imports', 'demo'), visibility: 'private',
    }, testerToken);
    expect(r.status).toBe(201);
    expect(r.data.name).toBe('imported-demo');
  });
});

describe('import + validate + diff', () => {
  let token = '';
  let repoId = 0;
  let prId = 0;

  it('logs in and imports pasted SKILL.md', async () => {
    const l = await api('POST', '/api/login', { username: 'tester', password: 'secret12' });
    token = l.data.token;
    expect(token).toBeTruthy();
    const imp = await api('POST', '/api/import/paste', {
      owner: 'tester',
      skill_md: '---\nname: pasted\ndescription: Pasted skill\n---\n\n# Pasted\n\nDo the thing, carefully and completely.',
    }, token);
    expect(imp.status).toBe(201);
    repoId = imp.data.id;
  });

  it('validates the imported skill as ok', async () => {
    const { status, data } = await api('POST', `/api/repos/${repoId}/validate`, {}, token);
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it('shows a PR diff', async () => {
    await api('POST', `/api/repos/${repoId}/branches`, { name: 'feat-x' }, token);
    await api('POST', `/api/repos/${repoId}/commit`, {
      branch: 'feat-x', message: 'more docs', files: { 'SKILL.md': '---\nname: pasted\ndescription: Pasted skill\n---\n\n# Pasted\n\nDo the thing, with extra care.\n' },
    }, token);
    const pr = await api('POST', '/api/pulls', {
      repo_id: repoId, head_repo_id: repoId, head_branch: 'feat-x', title: 'More docs',
    }, token);
    prId = pr.data.id;
    const d = await api('GET', `/api/pulls/${prId}/diff`, undefined, token);
    expect(d.status).toBe(200);
    expect(d.data.diff).toContain('+Do the thing, with extra care.');
  });
});

describe('authorization — public visibility is not write access', () => {
  let alice = '';
  let bob = '';
  let repoId = 0;
  let prId = 0;

  it('registers two ordinary users', async () => {
    const a = await api('POST', '/api/users', { username: 'alice', email: 'alice@example.com', password: 'alicepass1' });
    expect(a.status).toBe(201);
    alice = a.data.token;
    const b = await api('POST', '/api/users', { username: 'bob', email: 'bob@example.com', password: 'bobpass12' });
    expect(b.status).toBe(201);
    bob = b.data.token;
  });

  it('alice creates a public repo, bob can read but not write', async () => {
    const created = await api('POST', '/api/repos', {
      owner: 'alice', name: 'shared', description: 'public', visibility: 'public',
    }, alice);
    expect(created.status).toBe(201);
    repoId = created.data.id;

    expect((await api('GET', `/api/repos/${repoId}`, undefined, bob)).status).toBe(200);
    expect((await api('POST', `/api/repos/${repoId}/commit`, {
      message: 'pwn', files: { 'SKILL.md': 'pwn' },
    }, bob)).status).toBe(403);
    expect((await api('POST', `/api/repos/${repoId}/branches`, { name: 'pwn' }, bob)).status).toBe(403);
    expect((await api('DELETE', `/api/repos/${repoId}`, undefined, bob)).status).toBe(403);
  });

  it('rejects ref and path injection from the owner too', async () => {
    expect((await api('POST', `/api/repos/${repoId}/branches`, {
      name: '--output=/tmp/pwn',
    }, alice)).status).toBe(400);
    expect((await api('GET', `/api/repos/${repoId}/commits?branch=--output=/tmp/pwn`, undefined, alice)).status).toBe(400);
    expect((await api('POST', `/api/repos/${repoId}/commit`, {
      message: 'evil', files: { '../evil': 'x' },
    }, alice)).status).toBe(400);
    expect((await api('POST', `/api/repos/${repoId}/commit`, {
      message: 'evil', files: { '.git/hooks/pre-commit': '#!/bin/sh\nid\n' },
    }, alice)).status).toBe(400);
  });

  it('stars are idempotent per user', async () => {
    const first = await api('POST', `/api/repos/${repoId}/star`, undefined, bob);
    expect(first.status).toBe(200);
    expect(first.data.stars).toBe(1);
    const second = await api('POST', `/api/repos/${repoId}/star`, undefined, bob);
    expect(second.status).toBe(200);
    expect(second.data.stars).toBe(1);
  });

  it('only the owner can merge a PR', async () => {
    await api('POST', `/api/repos/${repoId}/branches`, { name: 'feat-ok' }, alice);
    const c = await api('POST', `/api/repos/${repoId}/commit`, {
      branch: 'feat-ok', message: 'feat', files: { 'SKILL.md': '# feat\n' },
    }, alice);
    expect(c.status).toBe(201);
    const pr = await api('POST', '/api/pulls', {
      repo_id: repoId, head_repo_id: repoId, head_branch: 'feat-ok', base_branch: 'main', title: 'Feat',
    }, alice);
    expect(pr.status).toBe(201);
    prId = pr.data.id;
    expect((await api('POST', `/api/pulls/${prId}/merge`, undefined, bob)).status).toBe(403);
    expect((await api('POST', `/api/pulls/${prId}/merge`, undefined, alice)).status).toBe(200);
  });

  it('fork copies kind and refuses duplicates', async () => {
    const f = await api('POST', `/api/repos/${repoId}/fork`, undefined, bob);
    expect(f.status).toBe(201);
    expect(f.data.kind).toBe('skill');
    expect(f.data.forked_from_id).toBe(repoId);
    expect((await api('POST', `/api/repos/${repoId}/fork`, undefined, bob)).status).toBe(409);
  });
});

describe('password recovery', () => {
  it('always 200, even for unknown accounts', async () => {
    const { status } = await api('POST', '/api/users/recover', { username: 'ghost-xyz' });
    expect(status).toBe(200);
  });

  it('resets with a valid token, rejects reuse and junk', async () => {
    await api('POST', '/api/users/recover', { username: 'tester' });
    const tdb = new Database(path.join(tmp, 'robogarage.db'), { readonly: true });
    const row = tdb.prepare('SELECT token FROM password_resets WHERE used=0 ORDER BY created_at DESC LIMIT 1').get() as any;
    expect(row?.token).toMatch(/^[0-9a-f]{64}$/);
    tdb.close();
    expect((await api('POST', '/api/users/reset', { token: 'nope', password: 'newpass12' })).status).toBe(400);
    expect((await api('POST', '/api/users/reset', { token: row.token, password: 'x' })).status).toBe(400);
    expect((await api('POST', '/api/users/reset', { token: row.token, password: 'newpass12' })).status).toBe(200);
    expect((await api('POST', '/api/users/reset', { token: row.token, password: 'otherpass1' })).status).toBe(400);
    const login = await api('POST', '/api/login', { username: 'tester', password: 'newpass12' });
    expect(login.status).toBe(200);
    expect(login.data.token).toBeTruthy();
  });
});

describe('marketplace', () => {
  it('lists valid public claude plugins with real sha256, excludes the rest', async () => {
    const l = await api('POST', '/api/login', { username: 'tester', password: 'newpass12' });
    const token = l.data.token;
    await api('POST', '/api/repos', {
      owner: 'tester', name: 'good-plugin', description: 'Good one', kind: 'plugin', plugin_target: 'claude',
    }, token);
    await api('POST', '/api/repos', {
      owner: 'tester', name: 'oc-plugin', description: 'OC one', kind: 'plugin', plugin_target: 'opencode',
    }, token);
    const m = await api('GET', '/api/marketplace.json');
    expect(m.status).toBe(200);
    expect(m.data.name).toBe('robogarage');
    const names = m.data.plugins.map((p: any) => p.name);
    expect(names).toContain('good-plugin');
    expect(names).not.toContain('oc-plugin');
    const entry = m.data.plugins.find((p: any) => p.name === 'good-plugin');
    expect(entry.source.source).toBe('archive');
    expect(entry.source.sha256).toMatch(/^[0-9a-f]{64}$/);
    const byName = Object.fromEntries(m.data._robogarage.excluded.map((e: any) => [e.name, e.reason]));
    expect(byName['tester/oc-plugin']).toMatch(/not served/);
  });
});
