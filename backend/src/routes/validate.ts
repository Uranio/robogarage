import { Hono } from 'hono';
import { repoPath, getRepoRow } from '../db.js';
import { requester, visible } from './repos.js';
import { collectFiles, validateSkill, validateAgent, validatePlugin, PluginTarget } from '../validators.js';

const app = new Hono();
const TARGETS = ['claude', 'opencode', 'codex', 'cursor', 'gemini', 'generic'];

// Validate a repo at a ref against its kind (and plugin target).
app.post('/repos/:id/validate', async (c) => {
  const row = getRepoRow(Number(c.req.param('id')));
  if (!row || !visible(row, requester(c))) return c.json({ detail: 'not found' }, 404);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    /* empty body = defaults */
  }
  const ref = body.ref || row.default_branch;
  if (!/^[A-Za-z0-9._/-]{1,100}$/.test(ref)) return c.json({ detail: 'invalid ref' }, 400);
  const target = TARGETS.includes(body.target) ? body.target : row.plugin_target || 'generic';
  const { files, truncated } = await collectFiles(repoPath(row.owner, row.name), ref);
  const report =
    row.kind === 'agent'
      ? validateAgent(files)
      : row.kind === 'plugin'
        ? validatePlugin(files, target as PluginTarget)
        : validateSkill(files);
  return c.json({
    kind: row.kind,
    target: row.kind === 'plugin' ? target : 'canonical',
    ref,
    files: files.size,
    truncated,
    ...report,
  });
});

export default app;
