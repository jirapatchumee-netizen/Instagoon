import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';
import { cleanDraft, buildDefinition, launchProblems } from '../src/studio.mjs';
import { creditLevel, creditProgress } from '../src/credit-levels.mjs';

async function fixture({ costs = [2, 3, 4, 5], adultContent = false } = {}) {
  const f = await narrativeFixture();
  const draft = cleanDraft({name:'Yuki',handle:'yuki.cosplay',concept:'คอสเพลเยอร์ใจดี',age:24,avatar:'studio-drafts/one/a.webp',voiceTone:'เป็นกันเอง',
    levelStyles:['สวัสดีค่ะ','ยินดีต้อนรับกลับ','เพื่อนคนสนิท','เล่าให้ฟังนะ','คิดถึงนะ'],levelCosts:costs,adultContent});
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
  assert.ok(launchProblems(d).includes('levelCosts'));assert.ok(launchProblems(d).includes('adultContent'));
  assert.deepEqual(cleanDraft({}).levelCosts,costs);
  assert.equal(cleanDraft({}).adultContent,false);
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

test('adult mode uses one creator permission at every reward level, requires age verification and never auto-enables',async()=>{
  const f=await fixture();const before=f.energy();
  assert.equal((await f.send('locked',{adultMode:true})).status,403);assert.equal(f.energy(),before);assert.equal(f.calls(),0);
  const config=f.definition.relationship.creditProgression;config.adultContent=true;
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.definition),f.npc.id);
  for(let level=1;level<=5;level++)assert.equal(creditProgress(f.definition,{level,credits_spent:0}).adultAllowed,true);
  const adult=await f.send('adult',{adultMode:true});assert.equal(adult.status,200);assert.equal(adult.payload.level,1);
  // Revocation is immediate, even though paid cost schedules are pinned.
  config.adultContent=false;
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.definition),f.npc.id);
  const remaining=f.energy();assert.equal((await f.send('revoked',{adultMode:true})).status,403);assert.equal(f.energy(),remaining);
  assert.equal((await f.send('normal')).status,200);
  config.adultContent=true;
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.definition),f.npc.id);
  f.sql.prepare("UPDATE users SET age_verified_at=NULL WHERE id='one'").run();
  const unverifiedEnergy=f.energy();
  assert.equal((await f.send('unverified',{adultMode:true})).status,403);assert.equal(f.energy(),unverifiedEnergy);
  assert.equal((await f.send('unverified-normal')).status,403, 'the site-wide age gate still applies');
});

test('live legacy Studio cards use one adult permission and explicit false overrides their old level flags',()=>{
  const legacy={studioCreated:true,relationship:{creditProgression:{mode:'credits',adultLevels:[false,false,false,true,true]}}};
  for(let level=1;level<=5;level++)assert.equal(creditProgress(legacy,{level}).adultAllowed,true);
  legacy.relationship.creditProgression.adultContent=false;
  assert.equal(creditProgress(legacy,{level:5}).adultAllowed,false);
  legacy.relationship.creditProgression.adultContent='true';
  assert.equal(creditProgress(legacy,{level:5}).adultAllowed,false, 'malformed flags cannot enable adult mode');
  assert.equal(cleanDraft({adultLevels:[false,false,false,false,false]}).adultContent,false);
});

test('reward level cannot select a voice, gate background or reach the model through the romance ladder',async()=>{
  const f=await fixture();const inputs=[];
  // Simulate an already-published legacy Studio definition without republishing it.
  delete f.definition.relationship.creditProgression.purpose;
  f.definition.style.levelStyles=['LEGACY_STYLE_1','LEGACY_STYLE_2','LEGACY_STYLE_3','LEGACY_STYLE_4','LEGACY_STYLE_5'];
  f.definition.secrets=[{id:'backstory',content:'BACKGROUND_CONTEXT_SENTINEL',minLevel:4}];
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(f.definition),f.npc.id);
  // A complete legacy template must not restore its automatic relationship ladder for Studio cards.
  Object.assign(f.env,{ROMANCE_PROMPT_V1_T1:'LEGACY_ROMANCE_LADDER ',ROMANCE_PROMPT_V1_T2:'Level {{LEVEL}} ',ROMANCE_PROMPT_V1_T3:'{{STYLE_L5}}'});
  f.env.AI.run=async(...args)=>{inputs.push(JSON.stringify(args));return {response:JSON.stringify({reply:'เล่าเรื่องงานคอสให้ฟังนะ'})};};
  const first=await f.send('voice-1');assert.equal(first.payload.level,1);
  await f.send('voice-2');const third=await f.send('voice-3');assert.equal(third.payload.level,2);
  for(const input of inputs){
    assert.ok(input.includes('BACKGROUND_CONTEXT_SENTINEL'));
    assert.ok(input.includes(f.definition.style.tone));
    assert.ok(input.includes('Infer familiarity, trust and feelings from the actual conversation history'));
    assert.ok(!input.includes('LEGACY_STYLE_'));assert.ok(!input.includes('LEGACY_ROMANCE_LADDER'));
    assert.ok(!input.includes('Current Style for Level'));assert.ok(!input.includes('Overall Score:'));
    assert.match(input,/fiftyShadesMode\\?":false/);
  }
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
