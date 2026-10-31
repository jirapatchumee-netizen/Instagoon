import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { newNpc } from '../../../../src/modules/npc-studio/lib/npc/schema.ts';
import { validateNpcBundle } from '../../scripts/validate-npc-bundle.mjs';

test('validates manifest and rejects mismatched IDs and unsafe paths', async()=>{
 const zip=new JSZip();zip.file('character.json',JSON.stringify(newNpc('mira')));zip.file('manifest.json',JSON.stringify({format:'instagoon-npc',version:1,gameId:'mira',revisionId:'revision-v1',schemaVersion:'1.0',assets:[]}));
 let bytes=await zip.generateAsync({type:'nodebuffer'});assert.deepEqual(await validateNpcBundle(bytes),{gameId:'mira',revisionId:'revision-v1',assetCount:0});
 zip.file('manifest.json',JSON.stringify({format:'instagoon-npc',version:1,gameId:'other',revisionId:'revision-v1',schemaVersion:'1.0',assets:[]}));bytes=await zip.generateAsync({type:'nodebuffer'});await assert.rejects(()=>validateNpcBundle(bytes),/manifest/);
 zip.file('../bad.txt','x');bytes=await zip.generateAsync({type:'nodebuffer'});await assert.rejects(()=>validateNpcBundle(bytes),/unsafe/);
});
