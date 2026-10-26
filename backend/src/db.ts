import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Glitch-friendly: storage basato su file JSON anziché SQLite embedded
// Questo evita la dipendenza da better-sqlite3 (non serverless-compatible)

export interface User {
  id: string;
  username: string;
  display_name: string;
  color: string;
  avatar_url: string;
  password_hash: string;
  email: string;
  created_at: string;
}

export interface Repo {
  id: string;
  owner: string;
  name: string;
  description: string;
  visibility: 'public' | 'private';
  default_branch: string;
  forked_from_id: string | null;
  stars: number;
  created_at: string;
  kind: string;
  plugin_target: string;
}

export interface Star {
  repo_id: string;
  user_id: string;
  created_at: string;
}

export interface PasswordReset {
  token: string;
  user_id: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '..', 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const REPOS_PATH = path.join(DATA_DIR, 'repos.json');
const STARS_PATH = path.join(DATA_DIR, 'stars.json');
const RESETS_PATH = path.join(DATA_DIR, 'password_resets.json');
const COLLABORATORS_PATH = path.join(DATA_DIR, 'collaborators.json');
const PULLS_PATH = path.join(DATA_DIR, 'pulls.json');

// Assicurati che la directory dati esista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Carica/dump dati JSON (atomic per safety)
function readJson<T>(file: string): T {
  try {
    const data = fs.readFileSync(file, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return {} as T;
  }
}

function writeJson<T>(file: string, data: T): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Users ---

export function getUsers(): User[] {
  return readJson<User[]>(USERS_PATH);
}

export function getUser(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
  return getUsers().find((u) => u.username === username);
}

export function createUser(data: { username: string; display_name: string; password: string; email?: string }): User {
  const users = getUsers();
  // Verifica username univoco
  if (getUserByUsername(data.username)) {
    throw new Error('Username already exists');
  }
  const id = crypto.randomBytes(8).toString('hex');
  const passwordHash = crypto.randomBytes(16).toString('hex'); // In produzione usare bcrypt/argon2
  const user: User = {
    id,
    username: data.username,
    display_name: data.display_name,
    color: '#33ff66',
    avatar_url: '',
    password_hash: passwordHash,
    email: data.email || '',
    created_at: new Date().toISOString(),
  };
  users.push(user);
  writeJson(USERS_PATH, users);
  return user;
}

export function updateUserPassword(userId: string, newPassword: string): void {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found');
  // In produzione: hashing vero; qui usiamo solo un placeholder
  user.password_hash = crypto.randomBytes(16).toString('hex');
  writeJson(USERS_PATH, users);
}

// --- Repos ---

export function getRepos(): Repo[] {
  return readJson<Repo[]>(REPOS_PATH);
}

export function getRepo(id: string): Repo | undefined {
  return getRepos().find((r) => r.id === id);
}

export function getReposByOwner(owner: string): Repo[] {
  return getRepos().filter((r) => r.owner === owner);
}

export function createRepo(data: { owner: string; name: string; description?: string; visibility?: 'public' | 'private' }): Repo {
  const repos = getRepos();
  if (getRepoByName(data.owner, data.name)) {
    throw new Error('Repo already exists');
  }
  const repo: Repo = {
    id: crypto.randomBytes(8).toString('hex'),
    owner: data.owner,
    name: data.name,
    description: data.description || '',
    visibility: data.visibility || 'public',
    default_branch: 'main',
    forked_from_id: null,
    stars: 0,
    created_at: new Date().toISOString(),
    kind: 'skill',
    plugin_target: '',
  };
  repos.push(repo);
  writeJson(REPOS_PATH, repos);
  return repo;
}

export function getRepoByName(owner: string, name: string): Repo | undefined {
  return getRepos().find((r) => r.owner === owner && r.name === name);
}

// --- Stars ---

export function getStars(): Star[] {
  return readJson<Star[]>(STARS_PATH);
}

export function addStar(repoId: string, userId: string): void {
  const stars = getStars();
  // Idempotent: already starred?
  if (stars.some((s) => s.repo_id === repoId && s.user_id === userId)) return;
  stars.push({ repo_id: repoId, user_id: userId, created_at: new Date().toISOString() });
  writeJson(STARS_PATH, stars);
}

// --- Password Resets ---

export function getPasswordResets(): PasswordReset[] {
  return readJson<PasswordReset[]>(RESETS_PATH);
}

export function createPasswordReset(userId: string): PasswordReset {
  const resets = getPasswordResets();
  const token = crypto.randomBytes(32).toString('hex');
  const reset: PasswordReset = {
    token,
    user_id: userId,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    used: false,
    created_at: new Date().toISOString(),
  };
  resets.push(reset);
  writeJson(RESETS_PATH, resets);
  return reset;
}

export function usePasswordReset(token: string): boolean {
  const resets = getPasswordResets();
  const reset = resets.find((r) => r.token === token && !r.used);
  if (!reset) return false;
  reset.used = true;
  writeJson(RESETS_PATH, resets);
  return true;
}

// --- Collaborators ---

export function getCollaborators(): any[] {
  return readJson<any[]>(COLLABORATORS_PATH);
}

export function setCollaborators(collab: any[]): void {
  writeJson(COLLABORATORS_PATH, collab);
}

// --- Pulls ---

export function getPulls(): any[] {
  return readJson<any[]>(PULLS_PATH);
}

export function addPull(data: any): any {
  const pulls = getPulls();
  const pull: any = {
    id: crypto.randomBytes(8).toString('hex'),
    repo_id: data.repo_id,
    head_repo_id: data.head_repo_id,
    head_branch: data.head_branch,
    base_branch: data.base_branch || 'main',
    title: data.title,
    body: data.body || '',
    status: 'open',
    author: data.author || '',
    created_at: new Date().toISOString(),
  };
  pulls.push(pull);
  writeJson(PULLS_PATH, pulls);
  return pull;
}

// Helper: trova nome repo univoco
function getRepoByName(owner: string, name: string): Repo | undefined {
  return getRepos().find((r) => r.owner === owner && r.name === name);
}

// Inizializza i file JSON se non esistono
if (!fs.existsSync(USERS_PATH)) writeJson(USERS_PATH, []);
if (!fs.existsSync(REPOS_PATH)) writeJson(REPOS_PATH, []);
if (!fs.existsSync(STARS_PATH)) writeJson(STARS_PATH, []);
if (!fs.existsSync(RESETS_PATH)) writeJson(RESETS_PATH, []);
if (!fs.existsSync(COLLABORATORS_PATH)) writeJson(COLLABORATORS_PATH, []);
if (!fs.existsSync(PULLS_PATH)) writeJson(PULLS_PATH, []);