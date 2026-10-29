import JSZip from 'jszip';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { NpcSchema, type NpcDefinition } from './npc/schema.ts';
import { assetUrl, upload } from './client.ts';

export async function importNpc(file:File,creatorId:string):Promise<NpcDefinition>{
  if(file.size>40*1024*1024)throw new Error('ไฟล์ ZIP ต้องไม่เกิน 40 MB');
  const zip=await JSZip.loadAsync(await file.arrayBuffer());const entries=Object.values(zip.files);if(entries.length>210)throw new Error('ZIP มีไฟล์มากเกินไป');let size=0;
  for(const entry of entries){const raw=(entry as unknown as {unsafeOriginalName?:string}).unsafeOriginalName??entry.name;if(raw!==entry.name||raw.includes('..')||raw.startsWith('/')||raw.includes('\\')||raw.includes(':'))throw new Error('ZIP มีพาธไม่ปลอดภัย');const n=(entry as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize??0;size+=n;if(size>60*1024*1024)throw new Error('ข้อมูล ZIP ใหญ่เกินกำหนด');}
  const def=zip.file('character.json');if(!def)throw new Error('ไม่พบ character.json ใน ZIP');const raw=await def.async('string');if(raw.length>1024*1024)throw new Error('ข้อมูลตัวละครใหญ่เกินกำหนด');const npc=NpcSchema.parse(JSON.parse(raw));
  const images=new Map<string,File>();for(const asset of new Set([npc.avatar,...npc.rewards.map(r=>r.asset)].filter(Boolean))){const part=zip.file(asset);if(!part)throw new Error('ไม่พบภาพ '+asset);const bytes=await part.async('uint8array');if(bytes.length>10*1024*1024)throw new Error('ภาพใน ZIP ต้องไม่เกิน 10 MB');const ext=asset.split('.').pop()?.toLowerCase();if(ext==='gif')throw new Error('คลาวด์ยังไม่รองรับภาพ GIF กรุณาเปลี่ยนภาพก่อนนำเข้า');const mime=ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg';images.set(asset,new File([bytes],asset.split('/').pop()!,{type:mime}));}
  const mapped=new Map<string,string>();for(const [old,image] of images)mapped.set(old,(await upload(image)).asset);
  return NpcSchema.parse({...npc,id:creatorId,avatar:npc.avatar?mapped.get(npc.avatar):'',rewards:npc.rewards.map(r=>({...r,asset:r.asset?mapped.get(r.asset):''}))});
}
export async function exportNpc(npc:NpcDefinition){
  NpcSchema.parse(npc);const zip=new JSZip();zip.file('character.json',JSON.stringify(npc,null,2));zip.file('schema.json',JSON.stringify(zodToJsonSchema(NpcSchema,{name:'NpcDefinition',target:'jsonSchema7'}),null,2));zip.file('README.md','NPC definition schema 1.0. Contains character authoring data and assets only; no player history, API key, or runtime.\n');
  for(const asset of new Set([npc.avatar,...npc.rewards.map(r=>r.asset)].filter(Boolean))){const response=await fetch(assetUrl(asset),{credentials:'same-origin'});if(!response.ok)throw new Error('ดาวน์โหลดภาพไม่สำเร็จ: '+asset);zip.file(asset,await response.blob());}
  const url=URL.createObjectURL(await zip.generateAsync({type:'blob',compression:'DEFLATE'}));const a=document.createElement('a');a.href=url;a.download=npc.id+'.npc.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
