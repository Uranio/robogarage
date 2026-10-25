import { useEffect, useRef } from 'react';

// A dancing robot, pure ASCII. Arms alternate, legs kick opposite,
// it bounces on every beat and jumps every other bar. Notes float,
// the equalizer pumps. One <pre>, no canvas.
const W = 48;
const H = 15;

type Grid = string[][];

function blank(): Grid {
  return Array.from({ length: H }, () => new Array<string>(W).fill(' '));
}
function toStr(g: Grid): string {
  return g.map((r) => r.join('')).join('\n');
}
function set(g: Grid, x: number, y: number, ch: string) {
  if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch;
}
function text(g: Grid, x: number, y: number, s: string) {
  for (let i = 0; i < s.length; i++) set(g, x + i, y, s[i]);
}

type ArmPose = 'L' | 'R' | 'UP';
type LegPose = 'together' | 'kickL' | 'kickR' | 'tuck';

function robot(g: Grid, x0: number, y0: number, arm: ArmPose, leg: LegPose) {
  // antenna + head
  set(g, x0 + 5, y0, 'o');
  set(g, x0 + 5, y0 + 1, '|');
  text(g, x0 + 3, y0 + 2, '.---.');
  text(g, x0 + 3, y0 + 3, '|o o|');
  text(g, x0 + 3, y0 + 4, '|___|');
  // torso
  text(g, x0 + 3, y0 + 5, '.---.');
  text(g, x0 + 3, y0 + 6, '|[+]|');
  text(g, x0 + 3, y0 + 7, '|   |');
  text(g, x0 + 3, y0 + 8, '|___|');
  // arms
  const down = (x: number) => {
    set(g, x, y0 + 5, '|');
    set(g, x, y0 + 6, '|');
    set(g, x, y0 + 7, 'o');
  };
  const upL = () => {
    set(g, x0, y0 + 3, 'o');
    set(g, x0 + 1, y0 + 4, '/');
    set(g, x0 + 2, y0 + 5, '/');
  };
  const upR = () => {
    set(g, x0 + 10, y0 + 3, 'o');
    set(g, x0 + 9, y0 + 4, '\\');
    set(g, x0 + 8, y0 + 5, '\\');
  };
  if (arm === 'L') {
    upL();
    down(x0 + 9);
  } else if (arm === 'R') {
    down(x0 + 1);
    upR();
  } else {
    upL();
    upR();
  }
  // legs
  if (leg === 'together') {
    set(g, x0 + 4, y0 + 9, '|');
    set(g, x0 + 6, y0 + 9, '|');
    text(g, x0 + 3, y0 + 10, '_| |_');
  } else if (leg === 'kickL') {
    set(g, x0 + 3, y0 + 9, '/');
    set(g, x0 + 2, y0 + 10, 'o');
    set(g, x0 + 6, y0 + 9, '|');
    text(g, x0 + 6, y0 + 10, '|_');
  } else if (leg === 'kickR') {
    set(g, x0 + 7, y0 + 9, '\\');
    set(g, x0 + 8, y0 + 10, 'o');
    set(g, x0 + 4, y0 + 9, '|');
    text(g, x0 + 3, y0 + 10, '_|');
  } else {
    set(g, x0 + 3, y0 + 9, '/');
    set(g, x0 + 7, y0 + 9, '\\');
    set(g, x0 + 2, y0 + 10, 'o');
    set(g, x0 + 8, y0 + 10, 'o');
  }
}

export function paint(f: number): string {
  const g = blank();
  const beat = Math.floor(f / 4) % 4;
  const jumping = Math.floor(f / 32) % 2 === 1 && beat === 2;
  const x0 = Math.floor((W - 11) / 2);
  const y0 = jumping ? 2 : 3 + (beat % 2);

  if (jumping) robot(g, x0, y0, 'UP', 'tuck');
  else if (beat % 2 === 0) robot(g, x0, y0, 'L', 'kickR');
  else robot(g, x0, y0, 'R', 'kickL');

  // floating notes
  if (f % 16 < 10) set(g, x0 - 8, y0 + 1, '♪');
  if ((f + 8) % 16 < 10) set(g, x0 + 15, y0 + 3, '♪');
  return toStr(g);
}

export default function DancingRobot() {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (ref.current) ref.current.textContent = paint(2);
      return;
    }
    let f = 0;
    const id = setInterval(() => {
      f++;
      if (ref.current) ref.current.textContent = paint(f);
    }, 110);
    if (ref.current) ref.current.textContent = paint(0);
    return () => clearInterval(id);
  }, []);

  return (
    <pre
      ref={ref}
      aria-hidden
      className="grn"
      style={{ margin: 0, fontSize: 12, lineHeight: 1.2, userSelect: 'none', textAlign: 'left', display: 'inline-block' }}
    />
  );
}
