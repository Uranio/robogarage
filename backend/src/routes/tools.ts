import { Hono } from 'hono';

const app = new Hono();

// Install targets for the `$ get` tab — tools with a verified global
// (user-level) skills folder following the open Agent Skills layout:
// <dir>/<skill-name>/SKILL.md. Single source of truth: the UI renders this.
const TOOLS = [
  { id: 'claude', label: 'Claude Code', dir: '~/.claude/skills', glyph: '✳', color: '#D97757', agentDir: '~/.claude/agents', pluginHint: 'Load with: claude --plugin-dir <folder>' },
  { id: 'opencode', label: 'OpenCode', dir: '~/.config/opencode/skills', glyph: '❯', color: '#9AA4B2', agentDir: '~/.config/opencode/agents', pluginHint: 'Copy the .ts file into .opencode/plugins/ or add the npm package to opencode.json' },
  { id: 'codex', label: 'Codex CLI', dir: '~/.codex/skills', glyph: '◈', color: '#10A37C', agentDir: null, pluginHint: 'Install through the Codex plugin browser' },
  { id: 'cursor', label: 'Cursor', dir: '~/.cursor/skills', glyph: '◐', color: '#8B7CFF', agentDir: null, pluginHint: 'Import the folder as a Cursor plugin (.cursor-plugin/)' },
  { id: 'gemini', label: 'Gemini CLI', dir: '~/.gemini/skills', glyph: '✦', color: '#4E8DF5', agentDir: null, pluginHint: 'Install with: gemini extensions install <folder>' },
  { id: 'kiro', label: 'Kiro', dir: '~/.kiro/skills', glyph: '●', color: '#FF9900', agentDir: null, pluginHint: null },
  { id: 'agents', label: 'Any Agent Skills tool', dir: '~/.agents/skills', glyph: '≡', color: '#3AA88F', agentDir: null, pluginHint: null },
];

app.get('/tools', (c) => c.json(TOOLS));

export default app;
