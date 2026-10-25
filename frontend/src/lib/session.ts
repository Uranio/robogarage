import { useEffect, useState } from 'react';

const KEY = 'robogarage_user';
const KEY_AV = 'robogarage_avatar';
const KEY_TOK = 'robogarage_token';
const EVT = 'robogarage-session';

export function getSession(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function getSessionAvatar(): string | null {
  try { return localStorage.getItem(KEY_AV); } catch { return null; }
}

export function getToken(): string | null {
  try { return localStorage.getItem(KEY_TOK); } catch { return null; }
}

export function setSession(username: string, avatarUrl?: string | null, token?: string | null) {
  localStorage.setItem(KEY, username);
  if (avatarUrl) localStorage.setItem(KEY_AV, avatarUrl);
  else localStorage.removeItem(KEY_AV);
  if (token) localStorage.setItem(KEY_TOK, token);
  window.dispatchEvent(new Event(EVT));
}

export function clearSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(KEY_AV);
  localStorage.removeItem(KEY_TOK);
  window.dispatchEvent(new Event(EVT));
}

function useStored(getter: () => string | null): string | null {
  const [v, setV] = useState<string | null>(getter);
  useEffect(() => {
    const f = () => setV(getter());
    window.addEventListener(EVT, f);
    window.addEventListener('storage', f);
    return () => {
      window.removeEventListener(EVT, f);
      window.removeEventListener('storage', f);
    };
  }, [getter]);
  return v;
}

// eslint-disable-next-line react-hooks/exhaustive-deps
export function useSession(): string | null {
  return useStored(getSession);
}

// eslint-disable-next-line react-hooks/exhaustive-deps
export function useSessionAvatar(): string | null {
  return useStored(getSessionAvatar);
}
