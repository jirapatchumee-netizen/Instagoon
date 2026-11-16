import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';
import { cleanDraft, buildDefinition, launchProblems } from '../src/studio.mjs';
import { creditLevel } from '../src/credit-levels.mjs';

async function fixture({ costs = [2, 3, 4, 5], adultLevels = [false, true, false, true, true] } = {}) {
  const f = await narrativeFixture();
  const draft = cleanDraft({name:'Yuki',handle:'yuki.cosplay',concept:'คอสเพลเยอร์ใจดี',age:24,avatar:'studio-drafts/one/a.webp',voiceTone:'เป็นกันเอง',
    levelStyles:['สวัสดีค่ะ','ยินดีต้อนรับกลับ','เพื่อนคนสนิท','เล่าให้ฟังนะ','คิดถึงนะ'],levelCosts:costs,adultLevels});
  const definition = buildDefinition(draft, f.npc.id, {});
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(definition),f.npc.id);
  let calls = 0;
  Object.assign(f.env,{ PRIMARY_AI_PROVIDER:'workers-ai', AI:{async run(){ calls++; return {response:JSON.stringify({reply:'ขอบคุณที่แวะมาคุยกันนะ',affectionDelta:3,innerThought:'ดีใจจัง'})}; }} });
  const call = (path,{method='GET',data,uid='one'}={}) => f.request('',{uid,path,action:method==='GET'?'':'message',data});
  const send = (requestId, extra={}) => f.request('สวัสดี',{data:{message:'สวัสดี',requestId,...extra}});
  return {...f,draft,definition,call,send,calls:()=>calls,energy:()=>f.sql.prepare("SELECT free+purchased n FROM energy WHERE user_id='one'").get().n,
    progress:()=>f.sql.prepare('SELECT * FROM chat_credit_progress WHERE user_id=? AND creator_id=?').get('one',f.npc.id)};
}

test('costs are incremental, boundaries are exact, and malformed creator settings cannot launch',()=>{
  const costs=[100,200,300,400];
  assert.deepEqual([0,99,100,299,300,599,600,999,1000,4000].map(n=>creditLevel(n,costs)),[1,1,2,2,3,3,4,4,5,5]);
  const d=cleanDraft({levelCosts:[0,2,3,4],adultLevels:['true',false,false,false,false]});
  assert.ok(launchProblems(d).includes('levelCosts'));assert.ok(launchProblems(d).includes('adultLevels'));
  assert.deepEqual(cleanDraft({}).levelCosts,costs);
  assert.deepEqual(cleanDraft({}).adultLevels,[false,false,false,false,false]);
});

test('the additive migration preserves an existing Studio player level without inventing historical credits',()=>{
  const sql=new DatabaseSync(':memory:'),dir=new URL('../migrations/',import.meta.url);
  for(const name of readdirSync(dir).sort())if(name.endsWith('.sql')&&name<'0031')sql.exec(readFileSync(new URL(name,dir),'utf8'));
  sql.exec("INSERT INTO users(id,email,google_id,created_at) VALUES('old','old@example.com','old',1); INSERT INTO creators(id,name,bio) VALUES('cos_old','Old',''); INSERT INTO studio_creators(user_id,creator_id,updated_at) VALUES('old','cos_old',1); INSERT INTO relationships(user_id,creator_id,score) VALUES('old','cos_old',65);");
  sql.exec(readFileSync(new URL('0031_chat_credit_levels.sql',dir),'utf8'));
  const row=sql.prepare('SELECT * FROM chat_credit_progress').get();assert.equal(row.level,4);assert.equal(row.credits_spent,0);
  sql.prepare('INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES(?,?,1)').run('cos_old',JSON.stringify({relationship:{creditProgression:{mode:'credits'}}}));
  sql.exec("UPDATE relationships SET score=100 WHERE user_id='old'");assert.equal(sql.prepare('SELECT score FROM relationships').get().score,60);
  sql.close();
});

test('successful charged turns advance once, a response retry is free, and each player has independent progress',async()=>{
  const f=await fixture();const before=f.energy();
  const a=await f.send('turn-1');assert.equal(a.status,200,JSON.stringify(a.payload));
  assert.equal(a.payload.creditProgress.creditsSpent,1);assert.equal(a.payload.level,1);
  const duplicate=await f.send('turn-1');assert.equal(duplicate.status,200);
  assert.equal(f.calls(),1);assert.equal(f.energy(),before-1);assert.equal(f.progress().credits_spent,1);
  assert.equal((await f.send('turn-1',{message:'ข้อความใหม่'})).status,409);
  const b=await f.send('turn-2');assert.equal(b.payload.level,2);assert.equal(b.payload.relationship,20);assert.equal(b.payload.creditProgress.creditsRemaining,3);
  const get=await f.open();assert.equal(get.payload.chat.creditProgress.level,2);
  const second=await f.request('สวัสดี',{uid:'two',data:{message:'สวัสดี',requestId:'turn-1'}});
  assert.equal(second.payload.creditProgress.creditsSpent,1);assert.equal(second.payload.level,1);
  for(let i=3;i<=5;i++)await f.send('turn-'+i);
  assert.equal(f.progress().level,3);assert.equal(f.energy(),before-5);
});

test('adult mode checks creator permission at the current level before charging and never auto-enables',async()=>{
  const f=await fixture();const before=f.energy();
  assert.equal((await f.send('locked',{adultMode:true})).status,403);assert.equal(f.energy(),before);assert.equal(f.calls(),0);
  await f.send('one');await f.send('two'); // Lv.2 allows it.
  assert.equal((await f.send('adult',{adultMode:true})).status,200);
  // The creator can revoke a level immediately, even when the player's cost schedule is pinned.
  f.definition.relationship.creditProgression.adultLevels=[false,false,false,false,false];
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.definition),f.npc.id);
  const remaining=f.energy();assert.equal((await f.send('revoked',{adultMode:true})).status,403);assert.equal(f.energy(),remaining);
  assert.equal((await f.send('normal')).status,200);
  f.sql.prepare("UPDATE users SET age_verified_at=NULL WHERE id='one'").run();
  assert.equal((await f.send('unverified',{adultMode:true})).status,403);
});

test('AI failure and a rolled-back reply do not accrue credit; retries can then succeed',async()=>{
  const f=await fixture();const before=f.energy();const provider=f.env.AI;
  delete f.env.GEMINI_API_KEY;delete f.env.AI;
  assert.equal((await f.send('failure')).status,503);assert.equal(f.energy(),before);assert.equal(f.progress(),undefined);
  f.env.AI=provider;
  // Force SQLite to fail after the progress/receipt statements; the whole reply transaction must roll back.
  f.sql.exec("CREATE TRIGGER reject_reply BEFORE INSERT ON ai_chat_messages WHEN NEW.role='assistant' BEGIN SELECT RAISE(ABORT,'fixture_reply_failure'); END;");
  assert.equal((await f.send('db-failure')).status,500);assert.equal(f.energy(),before);assert.equal(f.progress(),undefined);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM chat_credit_receipts').get().n,0);
  f.sql.exec('DROP TRIGGER reject_reply');
  assert.equal((await f.send('db-failure')).status,200);assert.equal(f.progress().credits_spent,1);
});

test('cost revisions are pinned, chat reset preserves paid progress, and social actions cannot raise the level',async()=>{
  const f=await fixture();await f.send('start');
  f.definition.relationship.creditProgression.costs=[100,200,300,400];
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.definition),f.npc.id);
  const reached=await f.send('next');assert.equal(reached.payload.level,2);assert.deepEqual(reached.payload.creditProgress.costs,[2,3,4,5]);
  assert.equal(f.progress().config_version,'credits-v1:2,3,4,5');
  assert.equal((await f.request('',{action:'reset-chat'})).status,200);assert.equal(f.progress().credits_spent,2);
  f.sql.prepare('UPDATE relationships SET score=100,closeness=100,trust=100,romance=100 WHERE user_id=? AND creator_id=?').run('one',f.npc.id);
  const open=await f.open();assert.equal(open.payload.chat.level,2);assert.equal(open.payload.chat.score,20);
  assert.equal((await f.send('after-reset')).payload.creditProgress.creditsSpent,3);
});

test('missions use successful messages and the credit level, and image purchases never accrue chat credits',async()=>{
  const f=await fixture();
  f.definition.rewards=[{id:'photo',name:'รูปพิเศษ',asset:'assets/yuki.webp',unlockType:'mission',conditions:[{field:'level',value:2},{field:'turns',value:3}]}];
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.definition),f.npc.id);
  const path=`/api/chats/${f.npc.id}/rewards/unlock`,data={mediaKey:'assets/yuki.webp',method:'level'};
  await f.send('m1');assert.equal((await f.call(path,{method:'POST',data})).status,403);
  await f.send('m2');assert.equal((await f.call(path,{method:'POST',data})).payload.error,'reward_conditions_not_met');
  await f.send('m3');assert.equal((await f.call(path,{method:'POST',data})).status,200);
  const stats=await f.call(`/api/creators/${f.npc.id}/missions`);assert.equal(stats.payload.stats.turns,3);assert.equal(stats.payload.stats.level,2);
  f.definition.rewards.push({id:'photo2',name:'ภาพอีกใบ',asset:'assets/yuki2.webp',conditions:[{field:'level',value:5}]});
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.definition),f.npc.id);
  assert.equal((await f.call(path,{method:'POST',data:{mediaKey:'assets/yuki2.webp',method:'energy'}})).status,200);
  assert.equal(f.progress().credits_spent,3);
});

test('overlapping turns cannot charge twice, and credits are isolated between characters',async()=>{
  const f=await fixture();let unblock,entered;
  const started=new Promise(resolve=>entered=resolve),wait=new Promise(resolve=>unblock=resolve);
  f.env.AI.run=async()=>{entered();await wait;return {response:JSON.stringify({reply:'สวัสดีค่ะ'})};};
  const first=f.send('overlap');await started;
  assert.equal((await f.send('overlap')).status,409);unblock();assert.equal((await first).status,200);
  assert.equal((await f.send('overlap')).status,200);assert.equal(f.energy(),99);assert.equal(f.progress().credits_spent,1);
  const other={...f.definition,id:'another-creator'};
  f.sql.prepare('INSERT INTO creators(id,name,bio) VALUES(?,?,?)').run(other.id,'Other','');
  f.sql.prepare('INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES(?,?,?)').run(other.id,JSON.stringify(other),Date.now());
  const response=await f.call(`/api/chats/${other.id}/message`,{method:'POST',data:{message:'สวัสดี',requestId:'overlap'}});
  assert.equal(response.status,200);assert.equal(response.payload.creditProgress.creditsSpent,1);assert.equal(f.progress().credits_spent,1);
});
