import { Hono } from 'hono';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { db, repoPath, DATA_DIR, REPOS_DIR } from '../db.js';
import { git, initRepo, safeJoin } from '../git.js';
import { normalizeUsername } from './users.js';
import { needAuth, requester } from './repos.js';
import { parseFrontmatter, slugify } from '../frontmatter.js';

const app = new Hono();

// ---------------------------------------------------------------------------
// Import skills from the major LLM tools into RoboGarage.
// Two ways in: from a local folder or by pasting a SKILL.md.
//
// Filesystem imports are restricted to IMPORT_ROOTS (colon/comma separated
// absolute paths). This prevents an authenticated user from reading arbitrary
// server files (other users' private repos, credentials, /etc…). Inside the
// container only mounted directories are visible; mount what you need under
// /data/imports (or point IMPORT_ROOTS at another mount).
// ---------------------------------------------------------------------------

export { parseFrontmatter, slugify };

const IMPORT_SUBDIR = path.join(DATA_DIR, 'imports');

function defaultRoots(): string[] {
  const h = os.homedir();
  return [
    path.join(h, '.claude', 'skills'),
    path.join(h, '.codex', 'skills'),
    path.join(h, '.config', 'opencode', 'skills'),
    IMPORT_SUBDIR,
  ];
}

/** Configured import roots, with symlinks resolved when they exist. */
export function importRoots(): string[] {
  const raw = process.env.IMPORT_ROOTS;
  const roots = raw
    ? raw.split(path.delimiter).flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean)
    : defaultRoots();
  return roots.map((r) => {
    const abs = path.resolve(r === '~' ? os.homedir() : r.replace(/^~(?=\/)/, os.homedir()));
    try {
      return fs.realpathSync(abs);
    } catch {
      return abs;
    }
  });
}

function isInside(child: string, parent: string): boolean {
  return child === parent || child.startsWith(parent.endsWith(path.sep) ? parent : parent + path.sep);
}

/**
 * Resolve an import source and enforce the allowlist. Returns the real path,
 * throws an error with an HTTP status otherwise.
 */
export function assertImportPath(source: string): string {
  const expanded = source === '~' || source.startsWith('~/')
    ? path.join(os.homedir(), source.slice(1))
    : source;
  if (!path.isAbsolute(expanded)) {
    throw Object.assign(new Error('source_path must be absolute (~/ is ok)'), { status: 400 });
  }
  let real: string;
  try {
    real = fs.realpathSync(expanded);
  } catch {
    throw Object.assign(new Error('folder not found'), { status: 404 });
  }
  // Internal data is never importable: repos contain other users' private
  // skills, avatars are user uploads. Only DATA_DIR/imports is fair game.
  const dataDir = path.resolve(DATA_DIR);
  if (isInside(real, dataDir) && !isInside(real, path.resolve(IMPORT_SUBDIR))) {
    throw Object.assign(new Error('source_path is an internal data directory'), { status: 403 });
  }
  if (isInside(real, path.resolve(REPOS_DIR))) {
    throw Object.assign(new Error('source_path is an internal data directory'), { status: 403 });
  }
  const roots = importRoots();
  if (!roots.some((root) => isInside(real, root))) {
    throw Object.assign(
      new Error(`source_path is outside the allowed import roots (${roots.join(', ')})`),
      { status: 403 },
    );
  }
  return real;
}

function detectTool(p: string): string {
  const h = os.homedir();
  if (p.startsWith(path.join(h, '.claude'))) return 'claude';
  if (p.startsWith(path.join(h, '.codex'))) return 'codex';
  if (p.includes(`${path.sep}.config${path.sep}opencode`)) return 'opencode';
  return 'disk';
}

const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build', '.DS_Store']);
const MAX_FILES = 500;
const MAX_TOTAL = 10 * 1024 * 1024;
const MAX_FILE = 2 * 1024 * 1024;

function collect(src: string, rel = '', acc: Array<{ rel: string; abs: string; size: number }> = []) {
  for (const e of fs.readdirSync(path.join(src, rel), { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    // Symlinks are skipped entirely: they could point outside the allowed root.
    if (e.isSymbolicLink()) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    const abs = path.join(src, r);
    if (e.isDirectory()) collect(src, r, acc);
    else if (e.isFile()) {
      const size = fs.statSync(abs).size;
      if (size <= MAX_FILE) acc.push({ rel: r, abs, size });
    }
  }
  return acc;
}

function visibilityOf(v: unknown, def: string): string {
  return v === 'private' || v === 'public' ? (v as string) : def;
}

async function createRepoWithFiles(
  owner: string,
  ownerId: number,
  repoName: string,
  description: string,
  visibility: string,
  files: Array<{ rel: string; content: Buffer | string }>,
  commitMsg: string,
) {
  const dir = repoPath(owner, repoName);
  if (fs.existsSync(dir)) throw Object.assign(new Error('you already have a skill with this name'), { status: 409 });
  const info = db
    .prepare('INSERT INTO repos (owner_id, name, description, visibility) VALUES (?, ?, ?, ?)')
    .run(ownerId, repoName, description, visibility);
  const rowId = info.lastInsertRowid as number;
  try {
    await initRepo(dir);
    for (const f of files) {
      const full = safeJoin(dir, f.rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, f.content);
    }
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-m', commitMsg);
  } catch (e) {
    db.prepare('DELETE FROM repos WHERE id=?').run(rowId);
    fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  }
  db.prepare('INSERT OR IGNORE INTO collaborators (repo_id, user_id, role) VALUES (?, ?, ?)').run(rowId, ownerId, 'owner');
  return db.prepare('SELECT r.*, u.username AS owner FROM repos r JOIN users u ON u.id=r.owner_id WHERE r.id=?').get(rowId);
}

// Import from a folder on this machine (SKILL.md required at its root).
app.post('/import', async (c) => {
  const { owner, name, source_path, visibility } = await c.req.json();
  const denied = needAuth(c);
  if (denied) return denied;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(normalizeUsername(owner || '')) as any;
  if (!user) return c.json({ detail: 'owner not found' }, 404);
  if (user.username !== requester(c)) return c.json({ detail: 'you can only import into your own account' }, 403);
  if (!source_path || typeof source_path !== 'string') return c.json({ detail: 'source_path is required' }, 400);

  let src: string;
  try {
    src = assertImportPath(source_path);
  } catch (e: any) {
    return c.json({ detail: e.message }, e.status || 400);
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(src);
  } catch {
    return c.json({ detail: 'folder not found' }, 404);
  }
  if (!stat.isDirectory()) return c.json({ detail: 'source must be a folder containing SKILL.md' }, 400);
  const mdFile = safeJoin(src, 'SKILL.md');
  if (!fs.existsSync(mdFile)) return c.json({ detail: 'no SKILL.md in that folder' }, 400);
  const md = fs.readFileSync(mdFile, 'utf-8');
  const fm = parseFrontmatter(md);
  const repoName = slugify(name || fm.name || path.basename(src));
  if (!/^[a-z0-9-]{2,60}$/.test(repoName)) return c.json({ detail: 'name: lowercase, numbers, hyphens' }, 400);
  const files = collect(src);
  if (files.length === 0) return c.json({ detail: 'folder is empty (after skipping binaries/build dirs)' }, 400);
  if (files.length > MAX_FILES) return c.json({ detail: `too many files (max ${MAX_FILES})` }, 413);
  if (files.reduce((a, f) => a + f.size, 0) > MAX_TOTAL) return c.json({ detail: 'folder too large (max 10 MB)' }, 413);
  try {
    const row = await createRepoWithFiles(
      user.username, user.id, repoName, fm.description || `Imported from ${detectTool(src)}`,
      visibilityOf(visibility, 'private'),
      files.map((f) => ({ rel: f.rel, content: fs.readFileSync(f.abs) })),
      `import skill from ${detectTool(src)}: ${path.basename(src)}`,
    );
    return c.json(row, 201);
  } catch (e: any) {
    return c.json({ detail: e.message || 'import failed' }, e.status || 400);
  }
});

// Import by pasting a SKILL.md (name + description required in frontmatter).
app.post('/import/paste', async (c) => {
  const { owner, name, skill_md, visibility } = await c.req.json();
  const denied = needAuth(c);
  if (denied) return denied;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(normalizeUsername(owner || '')) as any;
  if (!user) return c.json({ detail: 'owner not found' }, 404);
  if (user.username !== requester(c)) return c.json({ detail: 'you can only import into your own account' }, 403);
  if (!skill_md || typeof skill_md !== 'string' || skill_md.length > 200 * 1024) {
    return c.json({ detail: 'skill_md must be SKILL.md text (max 200 KB)' }, 400);
  }
  const fm = parseFrontmatter(skill_md);
  if (!fm.name || !fm.description) return c.json({ detail: 'SKILL.md needs name + description in its frontmatter' }, 400);
  const repoName = slugify(name || fm.name);
  if (!/^[a-z0-9-]{2,60}$/.test(repoName)) return c.json({ detail: 'name: lowercase, numbers, hyphens' }, 400);
  try {
    const row = await createRepoWithFiles(
      user.username, user.id, repoName, fm.description,
      visibilityOf(visibility, 'private'),
      [{ rel: 'SKILL.md', content: skill_md }],
      `import pasted SKILL.md (${fm.name})`,
    );
    return c.json(row, 201);
  } catch (e: any) {
    return c.json({ detail: e.message || 'import failed' }, e.status || 400);
  }
});

export default app;
