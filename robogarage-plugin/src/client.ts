/**
 * RoboGarage API client.
 * Usa un token (PAT o JWT) per autenticarsi contro il backend di RoboGarage.
 * Espone le operazioni necessarie al plugin: validate, import, create repo, list, marketplace.
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

export class RoboGarageClient {
  constructor(private baseUrl: string, private token: string) {}

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
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
    return res.json() as Promise<T>;
  }

  /** Valida una skill/plugin tramite l'API di RoboGarage. */
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

  /** Importa una SKILL.md incollata in un repository RoboGarage. */
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

  /** Crea un nuovo repository skill/agent/plugin su RoboGarage. */
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

  /** Lista i repository visibili all'utente. */
  async listRepos(q?: string): Promise<RepoRow[]> {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.request<RepoRow[]>(`/api/repos${query}`);
  }

  /** Ottiene il marketplace JSON (skill pubbliche validate). */
  async marketplace(): Promise<MarketplaceItem[]> {
    return this.request<MarketplaceItem[]>('/api/marketplace.json');
  }

  /** Healthcheck del backend. */
  async health(): Promise<{ ok: boolean; time: string }> {
    return this.request<{ ok: boolean; time: string }>('/api/health');
  }
}
