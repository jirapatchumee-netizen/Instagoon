export async function request<T>(url:string,init?:RequestInit):Promise<T> {
  const response=await fetch(url,{credentials:'same-origin',...init});const result=await response.json().catch(()=>null);
  if(!response.ok)throw new Error((result&&typeof result.error==='string'?result.error:`HTTP ${response.status}`));
  return result as T;
}
export const assetUrl=(asset:string)=>asset?'/api/admin/media/'+encodeURIComponent(asset):'';
async function toWebp(file:File):Promise<Blob> {
  const bitmap=await createImageBitmap(file);const max=1800;const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx){bitmap.close();throw new Error('ไม่สามารถเตรียมภาพได้');}ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  for(const quality of [0.9,0.8,0.7,0.6,0.45,0.3]){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=850*1024)return blob;}
  throw new Error('ภาพใหญ่เกินข้อจำกัดของคลาวด์ กรุณาย่อภาพก่อนอัปโหลด');
}
export async function upload(file:File,kind:'upload'|'import'='upload') {
  if(kind==='import')throw new Error('คลาวด์ยังไม่รองรับนำเข้า ZIP ในหน้านี้');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('คลาวด์รองรับ PNG, JPEG หรือ WebP และจะแปลงเป็น WebP ก่อนบันทึก');
  const blob=await toWebp(file);const asset=`assets/${crypto.randomUUID()}.webp`;await request('/api/admin/media/'+encodeURIComponent(asset),{method:'PUT',headers:{'Content-Type':'image/webp'},body:blob});return {asset,npc:undefined as never};
}
