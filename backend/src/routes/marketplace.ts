import { Hono } from 'hono';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { db, repoPath, DATA_DIR } from '../db.js';
import { git, archive } from '../git.js';
import { collectFiles, validatePlugin } from '../validators.js';

const app = new Hono();

// ---------------------------------------------------------------------------
// RoboGarage as a Claude marketplace: GET /api/marketplace.json lists every
// PUBLIC plugin with target=claude that validates with zero errors, as
// `archive` sources (our tarballs) with a real sha256 — computed once per
// commit and cached. Install: `claude plugin marketplace add <this-url>`.
// Broken or private plugins are excluded (named in _robogarage, which Claude
// ignores as an unknown top-level key).
// ---------------------------------------------------------------------------

const CACHE_FILE = path.join(DATA_DIR, 'marketplace-cache.json');

function loadCache(): Record<string, { commit: string; sha256: string }> {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

app.get('/marketplace.json', async (c) => {
  const origin = process.env.PUBLIC_URL || new URL(c.req.url).origin;
  const plugins = db
    .prepare(
      `SELECT r.*, u.username AS owner FROM repos r JOIN users u ON u.id=r.owner_id
       WHERE r.kind='plugin' AND r.visibility='public' ORDER BY r.stars DESC, r.id`,
    )
    .all() as any[];
  const entries: any[] = [];
  const excluded: Array<{ name: string; reason: string }> = [];
  const cache = loadCache();
  let dirty = false;

  for (const p of plugins) {
    const id = `${p.owner}/${p.name}`;
    if ((p.plugin_target || 'claude') !== 'claude') {
      excluded.push({ name: id, reason: `target ${p.plugin_target} is not served by this marketplace` });
      continue;
    }
    const dir = repoPath(p.owner, p.name);
    const { files } = await collectFiles(dir, p.default_branch);
    const report = validatePlugin(files, 'claude');
    if (!report.ok) {
      excluded.push({ name: id, reason: report.errors[0]?.message || 'fails validation' });
      continue;
    }
    const commit = await git(dir, 'rev-parse', p.default_branch).catch(() => '');
    const key = String(p.id);
    let sha = cache[key]?.commit === commit && commit ? cache[key].sha256 : null;
    if (!sha) {
      try {
        const buf = await archive(dir, p.default_branch, p.name);
        sha = createHash('sha256').update(buf).digest('hex');
        cache[key] = { commit, sha256: sha };
        dirty = true;
      } catch {
        excluded.push({ name: id, reason: 'could not build archive' });
        continue;
      }
    }
    let version: string | undefined;
    let description = p.description;
    try {
      const m = JSON.parse(files.get('.claude-plugin/plugin.json') || '{}');
      if (m.version) version = m.version;
      if (m.description) description = m.description;
    } catch {
      /* validated already — unreachable */
    }
    entries.push({
      name: p.name,
      source: {
        source: 'archive',
        url: `${origin}/api/repos/${p.id}/archive?ref=${p.default_branch}`,
        sha256: sha,
      },
      description,
      ...(version ? { version } : {}),
    });
  }
  if (dirty) {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch {
      /* cache is best-effort */
    }
  }
  return c.json(
    {
      name: 'robogarage',
      owner: { name: 'RoboGarage' },
      plugins: entries,
      _robogarage: { generated_at: new Date().toISOString(), excluded },
    },
    200,
    { 'Cache-Control': 'public, max-age=60' },
  );
});

export default app;
