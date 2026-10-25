export interface User { id: number; username: string; display_name: string; color: string; created_at: string }
export interface Repo {
  id: number; owner_id: number; owner: string; name: string;
  description: string; visibility: string; default_branch: string;
  forked_from_id: number | null; stars: number; created_at: string;
}
export interface Pull { id: number; repo_id: number; head_repo_id: number; head_branch: string; base_branch: string; title: string; body: string; status: string; author: string; created_at: string }
