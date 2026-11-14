export function compactCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, '') + 'k';
  return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
}

export function initialCluster(name: string | undefined): string {
  return Array.from(name || '?')[0] || '?';
}

// Stable per account and calendar day, so the hero does not jump between renders or refetches.
export function heroIndex(seedKey: string, length: number, at = Date.now()): number {
  if (length <= 0) return 0;
  const key = new Date(at).toISOString().slice(0, 10) + '|' + seedKey;
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % length;
}
