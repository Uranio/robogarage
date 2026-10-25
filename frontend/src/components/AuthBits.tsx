export const COLORS = ['#33ff66', '#ffb000', '#5ac8fa', '#ff6b9d', '#c792ea', '#ff7b72'];
export const USER_RE = /^[a-z0-9-]{2,24}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Check = { state: 'idle' | 'checking' | 'ok' | 'taken' | 'invalid'; msg: string };
export const idleCheck: Check = { state: 'idle', msg: '' };

export function Status({ check, pending }: { check: Check; pending: string }) {
  return (
    <div style={{ fontSize: 12 }} className={
      check.state === 'ok' ? 'grn' : check.state === 'taken' || check.state === 'invalid' ? 'amb' : 'dim'}>
      {check.state === 'checking' ? <span className="dim">{pending}</span> : check.msg}
    </div>
  );
}
