import assetsJson from '../../games/overtime/assets.json';
import { OVERTIME_BACKGROUNDS, OVERTIME_CHARACTERS } from './overtimeSecretsAssets';

export type AssetStatus = 'missing' | 'legacy' | 'draft' | 'approved' | 'procedural';

interface Entry {
  kind: string;
  status: AssetStatus;
  file?: string;
  version?: number;
  shot?: string;
}

const assets = (assetsJson as unknown as { assets: Record<string, Entry> }).assets;

export function resolveAssetPath(fileOrUrl: string): string {
  if (!fileOrUrl) return fileOrUrl;
  if (fileOrUrl.startsWith('data:') || fileOrUrl.startsWith('http://') || fileOrUrl.startsWith('https://')) {
    return fileOrUrl;
  }
  let clean = fileOrUrl.startsWith('/') ? fileOrUrl.slice(1) : fileOrUrl;
  if (clean.endsWith('.png')) {
    clean = clean.slice(0, -4) + '.webp';
  }
  const base = import.meta.env.BASE_URL || './';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${clean}`;
}

const uri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const bgPlaceholder = (id: string) =>
  uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 544 960">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs>
    <rect width="544" height="960" fill="url(#g)"/>
    <text x="272" y="470" fill="#94a3b8" font-family="monospace" font-size="22" text-anchor="middle">${id}</text>
    <text x="272" y="505" fill="#64748b" font-family="monospace" font-size="16" text-anchor="middle">asset missing</text>
  </svg>`);

const spritePlaceholder = (key: string) =>
  uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 544 960">
    <g fill="#e2e8f0" fill-opacity="0.22" stroke="#e2e8f0" stroke-opacity="0.5" stroke-width="2">
      <ellipse cx="272" cy="300" rx="85" ry="105"/>
      <path d="M110 960 Q120 520 272 480 Q424 520 434 960 Z"/>
    </g>
    <text x="272" y="640" fill="#f8fafc" font-family="monospace" font-size="24" text-anchor="middle">${key}</text>
    <text x="272" y="675" fill="#cbd5e1" font-family="monospace" font-size="16" text-anchor="middle">sprite missing</text>
  </svg>`);

export function assetInfo(key: string): { status: AssetStatus; version?: number } {
  const e = assets[key];
  return e ? { status: e.status, version: e.version } : { status: 'missing' };
}

export function bgSrc(id: string): string {
  const e = assets[id];
  if (e?.file) return resolveAssetPath(e.file);
  const fallback = OVERTIME_BACKGROUNDS[id]?.src;
  if (fallback) return resolveAssetPath(fallback);
  return bgPlaceholder(id);
}

export function hasRegistrySprites(characterId: string): boolean {
  return Object.keys(assets).some((k) => k.startsWith(`${characterId}:`) && !!assets[k]?.file);
}

export function spriteSrc(characterId: string, expression: string): string {
  const key = `${characterId}:${expression}`;
  const file = assets[key]?.file;
  if (file) return resolveAssetPath(file);
  const charFallback = OVERTIME_CHARACTERS[characterId]?.sprites?.[expression]
    ?? OVERTIME_CHARACTERS[characterId]?.sprites?.normal;
  if (charFallback) return charFallback;
  return spritePlaceholder(key);
}
