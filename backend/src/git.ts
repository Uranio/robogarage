import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const exec = promisify(execFile);

// Serialize mutating git operations per repository. The server keeps one
// working tree per repo; concurrent checkouts/commits would corrupt it.
const repoLocks = new Map<string, Promise<void>>();

export async function withRepoLock<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  const prev = repoLocks.get(dir) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => (release = resolve));
  const tail = prev.then(() => current);
  repoLocks.set(dir, tail);
  await prev.catch(() => {});
  try {
    return await fn();
  } finally {
    release();
    if (repoLocks.get(dir) === tail) repoLocks.delete(dir);
  }
}

// Refs and branch names are user input: never let them start with "-" (git
// option injection) or contain revision-range/traversal syntax.
export function assertRef(ref: unknown): string {
  const r = typeof ref === 'string' ? ref : '';
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(r) ||
    r.includes('..') ||
    r.includes('//') ||
    r.endsWith('/') ||
    r.endsWith('.lock') ||
    r.endsWith('.')
  ) {
    throw Object.assign(new Error('invalid ref'), { status: 400 });
  }
  return r;
}

// Paths inside a repo: relative, no traversal, no NUL, no .git internals
// (writing .git/hooks/* would be code execution inside the container).
export function assertRepoPath(p: unknown): string {
  const v = typeof p === 'string' ? p : '';
  if (
    !v ||
    v.length > 200 ||
    v.startsWith('/') ||
    v.includes('\0') ||
    v.split('/').some((s) => s === '..' || s === '.' || s === '' || s === '.git')
  ) {
    throw Object.assign(new Error('invalid path'), { status: 400 });
  }
  return v;
}

// Resolve `rel` inside `root` and refuse anything that escapes it.
export function safeJoin(root: string, rel: string): string {
  const abs = path.resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw Object.assign(new Error('invalid path'), { status: 400 });
  }
  return abs;
}

export async function git(cwd: string, ...args: string[]): Promise<string> {
  try {
    // safe.directory: repos may be created on the host and mounted into the
    // container (different uid); they are all ours.
    const { stdout } = await exec('git', ['-c', 'safe.directory=*', ...args], { cwd, timeout: 15000 });
    return stdout.trim();
  } catch (e: any) {
    throw new Error(`git ${args.join(' ')} failed: ${e.stderr || e.message}`);
  }
}

export async function initRepo(dir: string, branch = 'main'): Promise<void> {
  fs.mkdirSync(dir, { recursive: true });
  await git(dir, 'init', '-b', branch);
  await git(dir, 'config', 'user.email', 'robogarage@local');
  await git(dir, 'config', 'user.name', 'robogarage');
}

export async function listBranches(dir: string): Promise<string[]> {
  const out = await git(dir, 'branch', '--format=%(refname:short)');
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

export async function logCommits(dir: string, branch = 'main', limit = 50) {
  const fmt = '%H%x1f%an%x1f%ad%x1f%s%x1e';
  const out = await git(dir, 'log', `--pretty=format:${fmt}`, `--date=short`, '-n', String(limit), branch).catch(() => '');
  if (!out) return [];
  return out.split('\x1e').filter(Boolean).map((line) => {
    const [hash, author, date, message] = line.trim().split('\x1f');
    return { hash, author, date, message };
  });
}

export async function lsTree(dir: string, ref = 'main', subpath = ''): Promise<Array<{ name: string; type: string; path: string }>> {
  const target = subpath ? `${ref}:${subpath}` : ref;
  const out = await git(dir, 'ls-tree', '-z', target).catch(() => '');
  // fallback: list working dir if ref missing (fresh repo)
  if (!out) {
    if (subpath.split('/').includes('..')) return [];
    const base = subpath ? safeJoin(dir, subpath) : dir;
    if (!fs.existsSync(base)) return [];
    return fs.readdirSync(base, { withFileTypes: true })
      .filter((e) => e.name !== '.git')
      .map((e) => ({ name: e.name, type: e.isDirectory() ? 'tree' : 'blob', path: subpath ? `${subpath}/${e.name}` : e.name }));
  }
  return out.split('\0').filter(Boolean).map((line) => {
    const tab = line.indexOf('\t');
    const meta = line.slice(0, tab).split(' ');
    const name = line.slice(tab + 1);
    return { name, type: meta[1] === 'tree' ? 'tree' : 'blob', path: subpath ? `${subpath}/${name}` : name };
  });
}

export async function showBlob(dir: string, ref: string, filePath: string): Promise<string> {
  return git(dir, 'show', `${ref}:${filePath}`);
}

// Unified diff of a three-dot range (what `head` adds since it forked off
// `base`). Capped so a huge PR can't OOM the server.
export async function diffRange(
  dir: string,
  base: string,
  head: string,
  maxLines = 2000,
): Promise<{ diff: string; stat: string; truncated: boolean }> {
  const range = `${base}...${head}`;
  const stat = await git(dir, 'diff', '--stat', range).catch(() => '');
  let out = '';
  try {
    const { stdout } = await exec('git', ['-c', 'safe.directory=*', 'diff', '--no-color', '--unified=3', range], {
      cwd: dir,
      timeout: 15000,
      maxBuffer: 2 * 1024 * 1024,
    });
    out = stdout;
  } catch (e: any) {
    out = typeof e?.stdout === 'string' ? e.stdout : '';
  }
  const lines = out.split('\n');
  const truncated = lines.length > maxLines;
  return { diff: (truncated ? lines.slice(0, maxLines) : lines).join('\n'), stat, truncated };
}

// Whole-tree export for one-click installs (git archive → tar.gz buffer).
export async function archive(dir: string, ref: string, prefix: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      ['-c', 'safe.directory=*', 'archive', '--format=tar.gz', `--prefix=${prefix}/`, ref],
      { cwd: dir, timeout: 30000, maxBuffer: 50 * 1024 * 1024, encoding: 'buffer' },
      (err, stdout) => (err ? reject(err) : resolve(stdout as Buffer)),
    );
  });
}
