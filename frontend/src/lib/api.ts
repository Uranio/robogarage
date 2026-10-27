const base = import.meta.env.VITE_API_URL || '';
import { getToken, clearSession } from './session';

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const tok = getToken();
  if (tok) h['Authorization'] = `Bearer ${tok}`;
  return h;
}

async function req(path: string, init?: RequestInit) {
  const r = await fetch(base + path, { headers: headers(), ...init });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err: any = new Error((data as any).detail || `HTTP ${r.status}`);
    err.code = (data as any).code;
    err.status = r.status;
    if (r.status === 401 && !path.startsWith('/api/login') && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      clearSession();
      window.location.assign('/login');
    }
    throw err;
  }
  return data;
}
export const api = {
  users: () => req('/api/users'),
  stats: () => req('/api/stats'),
  createUser: (u: any) => req('/api/users', { method: 'POST', body: JSON.stringify(u) }),
  checkUsername: (username: string) => req(`/api/users/check?username=${encodeURIComponent(username)}`),
  checkEmail: (email: string) => req(`/api/users/check?email=${encodeURIComponent(email)}`),
  login: (username: string, password: string) =>
    req('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  recover: (username: string) =>
    req('/api/users/recover', { method: 'POST', body: JSON.stringify({ username }) }),
  resetPassword: (token: string, password: string) =>
    req('/api/users/reset', { method: 'POST', body: JSON.stringify({ token, password }) }),
  uploadAvatar: async (id: number, file: File) => {
    const fd = new FormData();
    fd.append('avatar', file);
    const h: Record<string, string> = {};
    const tok = getToken();
    if (tok) h['Authorization'] = `Bearer ${tok}`;
    const r = await fetch(`/api/users/${id}/avatar`, { method: 'POST', headers: h, body: fd });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data as any).detail || `HTTP ${r.status}`);
    return data;
  },
  avatarSrc: (rel?: string | null) => (rel ? `/api/avatars/${rel}` : null),
  repos: (q?: string) => req('/api/repos' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  createRepo: (r: any) => req('/api/repos', { method: 'POST', body: JSON.stringify(r) }),
  updateRepo: (id: number, patch: any) => req(`/api/repos/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  importPath: (p: any) => req('/api/import', { method: 'POST', body: JSON.stringify(p) }),
  importPaste: (p: any) => req('/api/import/paste', { method: 'POST', body: JSON.stringify(p) }),
  archiveUrl: (id: number, ref: string) => `/api/repos/${id}/archive?ref=${encodeURIComponent(ref)}`,
  rawUrl: (id: number, ref: string, path: string) => `/api/repos/${id}/raw?ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`,
  validate: (id: number, o: any) => req(`/api/repos/${id}/validate`, { method: 'POST', body: JSON.stringify(o || {}) }),
  tools: () => req('/api/tools'),
  repo: (id: number) => req(`/api/repos/${id}`),
  branches: (id: number) => req(`/api/repos/${id}/branches`),
  createBranch: (id: number, b: any) => req(`/api/repos/${id}/branches`, { method: 'POST', body: JSON.stringify(b) }),
  commits: (id: number, branch?: string) => req(`/api/repos/${id}/commits?branch=${encodeURIComponent(branch || 'main')}`),
  tree: (id: number, ref: string, path = '') => req(`/api/repos/${id}/tree?ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`),
  blob: (id: number, ref: string, path: string) => req(`/api/repos/${id}/blob?ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`),
  commit: (id: number, c: any) => req(`/api/repos/${id}/commit`, { method: 'POST', body: JSON.stringify(c) }),
  fork: (id: number) => req(`/api/repos/${id}/fork`, { method: 'POST' }),
  star: (id: number) => req(`/api/repos/${id}/star`, { method: 'POST' }),
  collabs: (id: number) => req(`/api/repos/${id}/collaborators`),
  addCollab: (id: number, c: any) => req(`/api/repos/${id}/collaborators`, { method: 'POST', body: JSON.stringify(c) }),
  pulls: (repo_id?: number) => req('/api/pulls' + (repo_id ? `?repo_id=${repo_id}` : '')),
  createPull: (p: any) => req('/api/pulls', { method: 'POST', body: JSON.stringify(p) }),
  mergePull: (id: number) => req(`/api/pulls/${id}/merge`, { method: 'POST' }),
  pullDiff: (id: number) => req(`/api/pulls/${id}/diff`),

  // --- Personal Access Token (PAT) ---
  createToken: (params: { name: string; scopes?: string; expires_in_days?: number }) =>
    req('/api/users/tokens', { method: 'POST', body: JSON.stringify(params) }),
  listTokens: () => req<{ id: number; name: string; prefix: string; scopes: string; expires_at: string | null; last_used_at: string | null; revoked: number; created_at: string }[]>('/api/users/tokens'),
  revokeToken: (id: number) => req<{ ok: boolean }>(`/api/users/tokens/${id}`, { method: 'DELETE' }),
};
