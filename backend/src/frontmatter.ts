// Shared frontmatter + slug helpers (dependency-free so unit tests stay light).

export function parseFrontmatter(md: string): Record<string, string> {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const data: Record<string, string> = {};
  if (!m) return data;
  for (const raw of m[1].split(/\r?\n/)) {
    const i = raw.indexOf(':');
    if (i <= 0) continue;
    const k = raw.slice(0, i).trim().toLowerCase();
    const v = raw.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && !(k in data)) data[k] = v;
  }
  return data;
}

export function slugify(s: string): string {
  return (
    (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'imported-skill'
  );
}
