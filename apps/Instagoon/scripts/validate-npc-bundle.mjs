// Offline validation only. This does not upload files or alter any database.
import JSZip from 'jszip';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { NpcSchema } from '../../../src/modules/npc-studio/lib/npc/schema.ts';

const fail = message => { throw new Error(message); };
const isImage = data => data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : data[0]===255 && data[1]===216 && data[2]===255 ? 'jpg' : data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP' ? 'webp' : null;
export async function validateNpcBundle(bytes) {
  if(bytes.length>40*1024*1024)fail('ZIP exceeds 40 MiB');
  const zip=await JSZip.loadAsync(bytes);const entries=Object.values(zip.files);
  if(entries.length>210)fail('too many ZIP entries');let total=0;
  for(const entry of entries){const raw=entry.unsafeOriginalName??entry.name;if(raw!==entry.name||raw.includes('..')||raw.startsWith('/')||raw.includes('\\')||raw.includes(':'))fail('unsafe ZIP path');total+=entry._data?.uncompressedSize??0;if(total>60*1024*1024)fail('ZIP exceeds uncompressed limit');}
  async function json(name){const entry=zip.file(name);if(!entry)fail(`missing ${name}`);const b=await entry.async('nodebuffer');if(b.length>1024*1024)fail(`${name} too large`);try{return JSON.parse(b.toString('utf8'));}catch{fail(`invalid ${name}`);}}
  const manifest=await json('manifest.json');const npc=NpcSchema.parse(await json('character.json'));
  if(manifest?.format!=='instagoon-npc'||manifest.version!==1||manifest.schemaVersion!==npc.schemaVersion||manifest.gameId!==npc.id||!(/^[a-zA-Z0-9_-]{1,80}$/).test(manifest.gameId)||!(/^[a-zA-Z0-9_-]{1,100}$/).test(manifest.revisionId)||!Array.isArray(manifest.assets))fail('invalid manifest');
  const assets=[...new Set([npc.avatar,...npc.rewards.map(r=>r.asset)].filter(Boolean))];if(assets.length!==manifest.assets.length)fail('manifest assets mismatch');
  for(const asset of assets){const entries=manifest.assets.filter(x=>x?.path===asset);if(entries.length!==1)fail('invalid asset manifest');const entry=zip.file(asset);if(!entry)fail('missing asset');const data=await entry.async('nodebuffer');if(data.length>900*1024)fail('asset exceeds 900 KiB');const type=isImage(data);const ext=asset.split('.').pop().toLowerCase();if(!type||!(type===ext||(type==='jpg'&&ext==='jpeg')))fail('unsupported or mismatched image');if(entries[0].bytes!==data.length||entries[0].sha256!==createHash('sha256').update(data).digest('hex'))fail('asset hash mismatch');}
  return {gameId:manifest.gameId,revisionId:manifest.revisionId,assetCount:assets.length};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){try{const result=await validateNpcBundle(await readFile(process.argv[2]));process.stdout.write(JSON.stringify(result)+'\n');}catch(error){process.stderr.write('Invalid NPC package: '+(error instanceof Error?error.message:'unknown error')+'\n');process.exitCode=1;}}
