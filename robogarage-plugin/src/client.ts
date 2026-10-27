/**
 * RoboGarage API Client.
 * Comunica con il backend di RoboGarage usando un Personal Access Token (PAT) o JWT.
 * Espone tutte le operazioni necessarie al plugin: validate, import, create repo, list, marketplace, health.
 */

export interface ValidateOptions {
  ref?: string;
  target?: string;
}

export interface ValidateReport {
  ok: boolean;
  kind?: string;
  files?: number;
  errors?: Array<{ path?: string; message: string }>;
  warnings?: Array<{ path?: string; message: string }>;
  truncated?: boolean;
}

export interface RepoRow {
  id: number;
  owner_id: number;
  owner: string;
  name: string;
  description: string;
  visibility: string;
  default_branch: string;
  kind: string;
  plugin_target: string;
  stars: number;
  created_at: string;
}

export interface MarketplaceItem {
  name: string;
  description: string;
  archive_url: string;
  sha256: string;
  target: string;
  owner: string;
}

export interface TokenInfo {
  id: number;
  name: string;
  prefix: string;
  scopes: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked: number;
  created_at: string;
}

export class RoboGarageClient {
  constructor(private baseUrl: string, private token: string) {}

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      ...extra,
    };
  }

  private async request<T>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.headers(),
      ...init,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`RoboGarage API ${res.status}: ${body || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json() as Promise<T>;
    }
    return res.text() as unknown as T;
  }

  async health(): Promise<{ ok: boolean; time: string }> {
    return this.request<{ ok: boolean; time: string }>('/api/health');
  }

  async validate(
    repoId: number,
    opts: ValidateOptions = {}
  ): Promise<ValidateReport> {
    const body: Record<string, unknown> = {};
    if (opts.ref) body.ref = opts.ref;
    if (opts.target) body.target = opts.target;
    return this.request<ValidateReport>(
      `/api/repos/${repoId}/validate`,
      { method: 'POST', body: JSON.stringify(body) }
    );
  }

  async importPaste(params: {
    owner: string;
    skill_md: string;
    name?: string;
    visibility?: 'public' | 'private';
  }): Promise<RepoRow> {
    return this.request<RepoRow>('/api/import/paste', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async createRepo(params: {
    owner: string;
    name: string;
    description?: string;
    visibility?: 'public' | 'private';
    kind?: 'skill' | 'agent' | 'plugin';
    plugin_target?: 'claude' | 'opencode' | 'codex' | 'cursor' | 'gemini';
  }): Promise<RepoRow> {
    return this.request<RepoRow>('/api/repos', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async listRepos(q?: string): Promise<RepoRow[]> {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.request<RepoRow[]>(`/api/repos${query}`);
  }

  async marketplace(): Promise<MarketplaceItem[]> {
    return this.request<MarketplaceItem[]>('/api/marketplace.json');
  }

  async createToken(params: {
    name: string;
    scopes?: string;
    expires_in_days?: number;
  }): Promise<{ token: string; prefix: string; id: number; name: string; scopes: string; expires_at: string | null }> {
    return this.request('/api/users/tokens', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async listTokens(): Promise<TokenInfo[]> {
    return this.request<TokenInfo[]>('/api/users/tokens');
  }

  async revokeToken(id: number): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(`/api/users/tokens/${id}`, {
      method: 'DELETE',
    });
  }
}
