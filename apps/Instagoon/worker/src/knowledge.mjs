export function selectKnowledge(npc,message){
 if(npc?.knowledgeEnabled===false)return [];
 const q=message.normalize('NFKC').toLocaleLowerCase();
 return (Array.isArray(npc?.knowledge)?npc.knowledge:[]).filter(e=>e&&typeof e.title==='string'&&[e.title,...(Array.isArray(e.aliases)?e.aliases:[])].some(t=>typeof t==='string'&&t.trim().length>1&&q.includes(t.trim().normalize('NFKC').toLocaleLowerCase()))).slice(0,4).map(e=>({title:e.title.slice(0,200),content:String(e.content||'').slice(0,2000),source:typeof e.source==='string'&&/^https?:\/\//i.test(e.source)?e.source.slice(0,1000):'',checkedAt:String(e.checkedAt||'').slice(0,30)}));
}
