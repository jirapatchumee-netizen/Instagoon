// Unpacks an NPC ZIP exported by the Content team's local system into apps/Instagoon/content.
// Validates first (validate-npc-bundle.mjs); writes nothing if the ZIP is invalid.
// Usage: node --experimental-strip-types scripts/import-npc-zip.mjs <bundle.zip> [contentDir]
import JSZip from 'jszip';
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateNpcBundle } from './validate-npc-bundle.mjs';

export async function importNpcZip(bytes, contentDir) {
  const { gameId } = await validateNpcBundle(bytes);
  const zip = await JSZip.loadAsync(bytes);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  const write = (file, data) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, data); };
  write(join(contentDir, 'creators', gameId, 'character.json'), await zip.file('character.json').async('nodebuffer'));
  for (const a of manifest.assets) write(join(contentDir, 'media', a.path), await zip.file(a.path).async('nodebuffer'));
  return { gameId, assets: manifest.assets.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const r = await importNpcZip(await readFile(process.argv[2]), process.argv[3] || fileURLToPath(new URL('../content', import.meta.url)));
    console.log(`imported ${r.gameId} (${r.assets} media files)`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
