import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { assertRef, assertRepoPath, safeJoin } from './git.js';
import { sniffImage } from './image.js';

function statusOf(fn: () => unknown): number {
  try {
    fn();
    return 0;
  } catch (e: any) {
    return e.status || -1;
  }
}

describe('assertRef — git option/range injection', () => {
  it.each(['main', 'feat/x', 'v1.0', 'release_1', 'user/fix-42'])('accepts %s', (ref) => {
    expect(assertRef(ref)).toBe(ref);
  });

  it.each([
    '--output=/tmp/pwn',
    '-x',
    'a..b',
    '../main',
    'main//x',
    'main/',
    'main.lock',
    'main.',
    '',
    'refs/heads/a b',
    'main;rm -rf /',
  ])('rejects %j', (ref) => {
    expect(statusOf(() => assertRef(ref))).toBe(400);
  });

  it('rejects non-strings', () => {
    expect(statusOf(() => assertRef(undefined))).toBe(400);
    expect(statusOf(() => assertRef({ toString: () => 'main' }))).toBe(400);
  });
});

describe('assertRepoPath — traversal and .git protection', () => {
  it.each(['SKILL.md', 'dir/file.md', '.claude-plugin/plugin.json', 'references/a-b_c.txt'])('accepts %s', (p) => {
    expect(assertRepoPath(p)).toBe(p);
  });

  it.each(['../evil', 'a/../../evil', '/etc/passwd', 'a//b', '', 'dir/', './x', 'a/./b'])('rejects %j', (p) => {
    expect(statusOf(() => assertRepoPath(p))).toBe(400);
  });

  it('refuses .git internals (hook = code execution)', () => {
    expect(statusOf(() => assertRepoPath('.git/config'))).toBe(400);
    expect(statusOf(() => assertRepoPath('a/.git/hooks/pre-commit'))).toBe(400);
  });
});

describe('safeJoin', () => {
  const root = '/srv/data/repos/alice/demo.git-work';

  it('joins inside the root', () => {
    expect(safeJoin(root, 'SKILL.md')).toBe(path.join(root, 'SKILL.md'));
  });

  it('refuses escapes', () => {
    expect(statusOf(() => safeJoin(root, '../other'))).toBe(400);
    expect(statusOf(() => safeJoin(root, '/etc/passwd'))).toBe(400);
  });
});

describe('sniffImage — magic bytes only', () => {
  it('accepts real PNG/JPEG/GIF/WEBP headers', () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(8)]);
    const gif = Buffer.from('GIF89a' + 'xxxx');
    const webp = Buffer.from('RIFF' + 'xxxx' + 'WEBP' + 'xxxx');
    expect(sniffImage(png)?.mime).toBe('image/png');
    expect(sniffImage(jpg)?.mime).toBe('image/jpeg');
    expect(sniffImage(gif)?.mime).toBe('image/gif');
    expect(sniffImage(webp)?.mime).toBe('image/webp');
  });

  it('rejects SVG and HTML disguised as images', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const html = Buffer.from('<html><script>alert(1)</script></html>');
    expect(sniffImage(svg)).toBeNull();
    expect(sniffImage(html)).toBeNull();
    expect(sniffImage(Buffer.from('not an image'))).toBeNull();
  });
});
