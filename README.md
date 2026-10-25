# RoboGarage — every robot needs a garage

Retro prompt-first UI. Local now, scalable later.

## What it is

Every **skill** = a **real repo** on the filesystem + a SQLite index for search, forks, stars, members, PRs.

```
Browser → Vite :5199 → Hono API :8901 → git CLI + SQLite + ./data/repos
```

## Local quickstart

```bash
cd robogarage
npm install
npm run dev           # backend :8901
npm run dev:frontend  # frontend :5199 (second terminal)
# open http://localhost:5199
```

Tests (from the repo root): `npm test` — 70+ tests, unit + live server (Node 22+).

Set `JWT_SECRET` in production (dev default warns); `PUBLIC_URL` so marketplace archive URLs point at your domain. Optional hardening knobs: `ADMIN_TOKEN` (enables the legacy first-password bootstrap, otherwise the endpoint is 404), `CORS_ORIGINS` (off by default — the app is same-origin), `IMPORT_ROOTS` (filesystem import allowlist, default `~/.claude/skills`, `~/.config/opencode/skills`, `~/.codex/skills`, `./data/imports`).

First boot seeds users `neo`, `trinity`.

## Skill layout (expected files)

Required:

- `SKILL.md` — frontmatter + instructions. Example:
  ```md
  ---
  name: web-scraper
  description: Extracts data from web pages
  version: 0.1.0
  author: neo
  license: MIT
  compatibility: opencode, claude
  tools: [read, webfetch, bash]
  ---
  # Web Scraper
  ...
  ```

Recommended (`POST /api/repos` scaffolds them):

| File | Why |
| ---- | --- |
| `README.md` | public showcase, install via `robogarage install owner/name` |
| `PROMPT.md` | secondary system prompt / variants |
| `references/*.md` | long context (API docs, edge cases) linked from SKILL.md |
| `scripts/*.{py,js,sh}` | executable skill tools (fetch, parse, eval) |
| `examples/input.md` + `examples/expected.md` | golden tests for regressions |
| `tests/*.test.{js,py}` | automatic evals, future CI |
| `assets/*` | templates, images, snippets |
| `CHANGELOG.md` | skill version history |
| `skill.json` | machine metadata (name, version, tools, permissions), mirrors frontmatter |
| `LICENSE` | MIT by default |

Rule: `SKILL.md` < 500 lines, operational body; details in `references/`, code in `scripts/`.

## Kinds: skills, agents, plugins

Repos have a `kind` (badge in Explore, filter, per-kind scaffold and `$ get` panel).

**Agents** — canonical `AGENT.md` (loads in Claude `~/.claude/agents` and OpenCode `~/.config/opencode/agents`):
```md
---
name: code-reviewer
description: Reviews changes… Use when…
mode: subagent
model: sonnet
temperature: 0.3
color: cyan
tools: [Read, Grep, Glob, Bash]
skills: [owner/skill-name]
---

# Code reviewer
(system prompt body…)
```
Design rule: **thin agents, portable skills** — the persona, model and tool limits live in `AGENT.md`; the workflow intelligence lives in skills it preloads via `skills: [owner/name]`.

**Plugins** — one repo, one target (`plugin_target`: claude, opencode, codex, cursor, gemini), scaffolded to that spec:
| Target | Layout |
| ------ | ------ |
| claude | `.claude-plugin/plugin.json` (`name` required) + `skills/`, `agents/`, `commands/`, `hooks/`, `.mcp.json` |
| opencode | `.ts/.js` module exporting hook functions (no manifest) |
| codex | bundle of ≥1 valid skill (no public manifest — validated as a bundle) |
| cursor | `.cursor-plugin/plugin.json` + components |
| gemini | `gemini-extension.json` (`name` required) |

## Validator

Our own `plugin validate`: `POST /api/repos/:id/validate {ref?, target?}` reads the tree at a ref (capped: 300 files / 5 MB) and checks manifest JSON, frontmatter (`name`/`description`/`mode`/`temperature`/`tools`), component layout, cross-links (scripts/references mentioned in body must exist) and target rules (kebab-case names, valid homepage URLs, no `:` in agent names…). Returns `{ok, errors[], warnings[]}` — the `$ check` tab renders it with a target picker for plugins.

## Marketplace

`GET /api/marketplace.json` turns RoboGarage into a Claude plugin marketplace: every **public** plugin with target `claude` that validates with zero errors is listed as an `archive` source with a real sha256 (computed once per commit, cached in `./data/marketplace-cache.json`). Broken, private or non-Claude plugins are excluded and named in `_robogarage.excluded` (ignored by Claude). Install:

```bash
claude plugin marketplace add http://localhost:8901/api/marketplace.json
```

Set `PUBLIC_URL` in production so archive URLs point at your domain.

## Private repos

- `visibility: public | private`, set at creation or via `PATCH /api/repos/:id` (owner only).
- The browser sends `x-user`; private repos are invisible to outsiders: list/search filter them, and every repo-scoped endpoint answers **404** (never leak existence).
- Owner-only: delete, settings, member management. Forks inherit visibility (private stays private).
- Local-grade model: no forged identity yet — in production `x-user` becomes a verified JWT claim, same headers, same checks.

## Install into Claude / OpenCode / Codex (like cloning)

Each skill exposes a tarball of any branch — the RoboGarage equivalent of `git clone`:

- `GET /api/repos/:id/archive?ref=main` — `git archive` stream (private repos: 404 for outsiders)
- The `$ get` tab on every repo page shows copy-paste commands, e.g.:
  ```bash
  curl -s "http://localhost:8901/api/repos/1/archive?ref=main" | tar -xz -C ~/.claude/skills/
  ```
  Targets (served by `GET /api/tools`, one place to extend): Claude Code, OpenCode, Codex CLI, Cursor, Gemini CLI, Kiro — plus `~/.agents/skills`, the shared Agent Skills folder read by Cursor, VS Code, Windsurf and Codex.
- No terminal at hand? The same tab offers a one-liner to paste **inside each tool's chat**, powered by `GET /api/repos/:id/raw?ref=&path=` (raw markdown, visibility-enforced):
  `Fetch http://localhost:8901/api/repos/1/raw?ref=main&path=SKILL.md and save it as ~/.claude/skills/web-scraper/SKILL.md, then confirm it loads.`

## Import (the other direction)

- `POST /api/import {owner, source_path, name?, visibility?}` — copies a local folder with a `SKILL.md` (skips `.git`/`node_modules`/build dirs and symlinks, max 500 files / 10 MB). The path must resolve **inside `IMPORT_ROOTS`** (comma/colon separated; `~/` supported); `data/repos`, `data/avatars` and the rest of `data/` are always refused. In Docker the default is `/data/imports`, so mount host folders there. Commits `import skill from <tool>: <dir>`.
- `POST /api/import/paste {owner, skill_md, name?, visibility?}` — imports pasted `SKILL.md` text (name + description required in frontmatter).
- Imports default to **private**. UI lives at `/import`.

## API

- `GET/POST /api/users` — register (lowercased username, scrypt password, unique email)
- `GET /api/users/check?username=|email=` — live availability (indexed lookups)
- `POST /api/login {username|email, password}` — returns the public profile **+ JWT** (`Authorization: Bearer`)
- `POST /api/users/recover {username|email}` — always 200; emails a single-use 30-min reset link (or logs it without SMTP)
- `POST /api/users/reset {token, password}` — set the new password
- Password mail needs `SMTP_HOST/PORT/USER/PASS/FROM` (+ `APP_URL` for links); without SMTP the link is printed in backend logs.
- Auth model: stateless HS256 JWT (7-day expiry, `JWT_SECRET` env; warns on dev default). Public reads stay open; **every write and every private read requires a valid token**, and writes require **owner/collaborator** — public visibility is not write access. Commit/PR/fork authorship is derived from the token — spoofed `author` fields are ignored. Ref names and repo paths are validated (no option injection, no traversal, no `.git/` writes). `GET /api/users` never exposes emails. The legacy `POST /api/users/password` is disabled unless `ADMIN_TOKEN` is set and requires the `x-admin-token` header; it only works on accounts with no password.
- `POST /api/users/:id/avatar` — profile image (multipart, 2 MB max)
- `GET /api/avatars/<aa>/<bb>/u<id>-<token>.<ext>` — immutable cache
- `GET/POST /api/repos` — create runs `git init -b main` + first commit
- `GET/PATCH /api/repos/:id` `DELETE` — detail / owner settings / owner delete
- `GET /api/repos/:id/branches` `POST .../branches {name, from}`
- `GET /api/repos/:id/commits?branch=` — `git log`
- `GET /api/repos/:id/tree?ref=&path=` — `git ls-tree`
- `GET /api/repos/:id/blob?ref=&path=` — `git show`
- `GET /api/repos/:id/archive?ref=` — tarball for one-click installs into Claude/OpenCode/Codex
- `GET /api/repos/:id/raw?ref=&path=` — raw file bytes for chat-based installs
- `POST /api/repos/:id/validate {ref?, target?}` — run the validator
- `GET /api/marketplace.json` — Claude marketplace generated from public, validating plugins
- `POST /api/repos/:id/commit {branch, message, author, files: {path: content|null}}`
- `POST /api/repos/:id/fork {owner_id}` — `git clone` + `forked_from_id`
- `POST /api/repos/:id/star` — +1
- `GET/POST /api/repos/:id/collaborators` — read members / owner manages
- `GET/POST /api/pulls` + `POST /api/pulls/:id/merge` — `git merge --no-ff`
- `GET /api/pulls/:id/diff` — reviewable unified diff (`base...head`) + stat, open for public repos

## Ops (server)

```bash
scripts/backup.sh                  # SQLite online backup + repos + avatars, 14-day retention
scripts/restore.sh <archive> --yes # destructive restore, with checksum + safety snapshot
scripts/healthcheck.sh             # frontend + API probe, restarts the stack if unhealthy
```

On the server these run as systemd user timers (backup daily 03:17, healthcheck
every 5 min); enable persistence with `loginctl enable-linger dupin`.
`ADMIN_TOKEN` in `.env` authorizes the legacy first-password bootstrap:
`POST /api/users/password` with header `x-admin-token` and only for accounts
without a password.

## Scaling (designed now, paid later)

1. **Now:** SQLite + local `./data`. Real git CLI = branches/commits/forks for free.
2. **Later (no API changes):**
   - SQLite → Postgres (`db.ts` only holds `users/repos/pulls` queries; content stays in git).
     `users.username` UNIQUE + partial unique email index → B-tree lookups, O(log n) at millions of rows.
   - Sharded avatars `avatars/<aa>/<bb>/…` (65k leaf dirs) → S3/GCS with **the same keys**: reimplement save/load/delete in `backend/src/avatars.ts` only.
     Random token in the name → immutable CDN cache + free invalidation per upload.
   - `./data/repos` → S3/EBS volume or internal Gitea; `git.ts` becomes a `GitStore` interface.
   - Hono is stateless → `docker compose up --scale backend=3` + nginx.
   - Auth: scrypt + stateless JWT done; OAuth later without changing the contract.
   - Queue for skill merges/tests: `jobs` table + worker, as in opencode-routines.

See the ready `docker-compose.yml`.
