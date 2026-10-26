import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '..', 'data');
export const REPOS_DIR = path.join(DATA_DIR, 'repos');
export const DB_PATH = path.join(DATA_DIR, 'robogarage.db');

// Legacy renames (SkillHub → RoboLib → RoboGarage eras): copy the newest
// existing DB (with WAL sidecars) so data survives every rebrand.
const LEGACY_DBS = ['robolib.db', 'skillhub.db'].map((f) => path.join(DATA_DIR, f));
if (!fs.existsSync(DB_PATH)) {
  const src = LEGACY_DBS.find((f) => fs.existsSync(f));
  if (src) {
    const destBase = DB_PATH;
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        if (fs.existsSync(src + suffix)) fs.copyFileSync(src + suffix, destBase + suffix);
      } catch {
        /* best-effort migration */
      }
    }
  }
}

fs.mkdirSync(REPOS_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  color TEXT DEFAULT '#33ff66',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  visibility TEXT DEFAULT 'public',
  default_branch TEXT DEFAULT 'main',
  forked_from_id INTEGER REFERENCES repos(id),
  stars INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(owner_id, name)
);
CREATE TABLE IF NOT EXISTS collaborators (
  repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'contributor',
  PRIMARY KEY (repo_id, user_id)
);
CREATE TABLE IF NOT EXISTS pulls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  head_repo_id INTEGER NOT NULL REFERENCES repos(id),
  head_branch TEXT NOT NULL,
  base_branch TEXT DEFAULT 'main',
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  author TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
`);

try {
  db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''`);
} catch {
  // column already present (existing DBs) — no problem
}
try {
  db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT ''`);
} catch {
  // column already present (existing DBs) — no problem
}
try {
  db.exec(`ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''`);
} catch {
  // column already present (existing DBs) — no problem
}
// Unique email, ignoring legacy empty values (partial index scales like any B-tree).
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email != ''`);
db.exec(`
CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id);
`);
try {
  db.exec(`ALTER TABLE repos ADD COLUMN kind TEXT DEFAULT 'skill'`);
} catch {
  // column already present (existing DBs) — no problem
}
try {
  db.exec(`ALTER TABLE repos ADD COLUMN plugin_target TEXT DEFAULT ''`);
} catch {
  // column already present (existing DBs) — no problem
}

// One star per user (the old counter could be spammed indefinitely).
db.exec(`
CREATE TABLE IF NOT EXISTS stars (
  repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (repo_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_repos_owner ON repos(owner_id);
CREATE INDEX IF NOT EXISTS idx_collab_user ON collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_pulls_repo ON pulls(repo_id);
CREATE INDEX IF NOT EXISTS idx_stars_user ON stars(user_id);
`);

export function repoPath(owner: string, name: string): string {
  return path.join(REPOS_DIR, owner, `${name}.git-work`);
}

export function getRepoRow(id: number) {
  return db.prepare(`
    SELECT r.*, u.username AS owner FROM repos r
    JOIN users u ON u.id = r.owner_id WHERE r.id = ?
  `).get(id) as any;
}
