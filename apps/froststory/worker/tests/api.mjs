import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import worker from '../src/index.mjs';

const sql = new DatabaseSync(':memory:');
const migrationsDir = new URL('../migrations/', import.meta.url);
for (const file of readdirSync(migrationsDir).sort()) {
 if (file.endsWith('.sql')) {
  sql.exec(readFileSync(new URL(file, migrationsDir), 'utf8'));
 }
}
const statement = (query, args=[]) => ({
 bind(...next) {return statement(query,next);},
 async first(){return sql.prepare(query).get(...args)??null;},
 async all(){return {results:sql.prepare(query).all(...args)};},
 async run(){const result=sql.prepare(query).run(...args);return {meta:{changes:result.changes}};}
});
const DB={prepare:statement,async batch(statements){sql.exec('BEGIN');try {const results=[];for(const s of statements) results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const objects=new Map();
const MEDIA={async list(){return {objects:[]}},async get(key){return objects.get(key)||null},async head(key){return objects.get(key)||null},async put(key,value,opts){if(objects.has(key))return null;const result={body:value,httpMetadata:opts.httpMetadata};objects.set(key,result);return result}};
const env={DB,MEDIA,PUBLIC_ORIGIN:'https://frost.test',ADMIN_EMAIL:'admin@example.com'};
const now=Date.now(),raw='a'.repeat(64),sid=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))), n=>n.toString(16).padStart(2,'0')).join('');
sql.prepare("INSERT INTO invites(email) VALUES('u@example.com')").run();
sql.prepare("INSERT INTO users(id,email,google_id,age_verified_at,consent_version,created_at) VALUES('u','u@example.com','g',?,'v1',?)").run(now,now);
sql.prepare("INSERT INTO energy(user_id) VALUES('u')").run();
sql.prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,'u',?)").run(sid,now+100000);
sql.prepare("INSERT INTO creators(id,name,bio) VALUES('c','Creator','bio')").run();
sql.prepare("INSERT INTO posts(id,creator_id,caption,published_at,status) VALUES('p','c','Hello',?,'published')").run(now-10000);
sql.prepare("INSERT INTO stories(id,creator_id,type,media_key,published_at,status) VALUES('s','c','unlockable','s.webp',?,'published')").run(now-10000);
sql.prepare("INSERT INTO episodes(id,creator_id,title,relationship_required,position) VALUES('ep1','c','One',0,1),('ep2','c','Two',2,2)").run();
const n1=JSON.stringify([{id:'start',text:'First revision',choices:[{id:'go',text:'Go',nextNodeId:'end'}],end:false},{id:'end',text:'End',choices:[],end:true}]);
const n2=JSON.stringify([{id:'start',text:'Second revision',choices:[],end:true}]);
sql.prepare("INSERT INTO revisions(id,creator_id,episode_id,nodes,status,created_at) VALUES('r1','c','ep1',?,'published',?)").run(n1,now-10000);
async function request(path,{method='GET',data,cookie=true,origin=true}={}){
 const headers={};if(cookie)headers.cookie=`frost_session=${raw}`;if(origin&&method!=='GET')headers.origin=env.PUBLIC_ORIGIN;if(data!==undefined)headers['content-type']='application/json';
 const response=await worker.fetch(new Request(env.PUBLIC_ORIGIN+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)}),env);let payload;try{payload=await response.json()}catch{payload=null}return {status:response.status,payload};
}
assert.equal((await request('/api/me',{cookie:false})).status,401);
assert.equal((await request('/auth/demo',{cookie:false})).status,404);
assert.equal(sql.prepare("SELECT COUNT(*) count FROM users WHERE email='creator@froststory.local'").get().count,0);
assert.equal((await request('/api/admin/overview')).status,403);
assert.equal((await request('/api/consent',{method:'POST',origin:false,data:{consentVersion:'v1'}})).status,403);
let result=await request('/api/posts/p/comments',{method:'POST',data:{requestId:'request1',content:'Hi'}});assert.equal(result.status,200);assert.equal(result.payload.energy.free,2);assert.equal(result.payload.relationship,1);
result=await request('/api/posts/p/comments',{method:'POST',data:{requestId:'request1',content:'Hi'}});assert.equal(result.payload.energy.free,2);
result=await request('/api/posts/p/comments',{method:'POST',data:{requestId:'request2',content:'Again'}});assert.equal(result.payload.energy.free,2);assert.equal(result.payload.relationship,1);
assert.equal((await request('/api/media/s.webp')).status,404);
result=await request('/api/stories/s/view',{method:'POST'});assert.equal(result.status,200);assert.equal(result.payload.story.expiresAt-result.payload.story.firstViewedAt,86400000);
sql.prepare("UPDATE story_views SET first_viewed_at=? WHERE user_id='u' AND story_id='s'").run(now-86400001);assert.equal((await request('/api/stories/s/view',{method:'POST'})).status,404);assert.equal((await request('/api/media/s.webp')).status,404);
result=await request('/api/chats/c');assert.equal(result.payload.chat.nodes[0].text,'First revision');
sql.prepare("INSERT INTO revisions(id,creator_id,episode_id,nodes,status,created_at) VALUES('r2','c','ep1',?,'published',?)").run(n2,now);
result=await request('/api/chats/c/choose',{method:'POST',data:{choiceId:'go'}});assert.equal(result.payload.chat.revisionId,'r1');assert.equal(result.payload.chat.nodes[0].text,'End');assert.equal(result.payload.chat.episodes[0].completed,true);
assert.equal(result.payload.chat.history[0].choiceText,'Go');
sql.prepare("INSERT INTO revisions(id,creator_id,episode_id,nodes,status,created_at) VALUES('r3','c','ep2',?,'published',?)").run(n2,now);
result=await request('/api/chats/c/episode',{method:'POST',data:{episodeId:'ep2'}});assert.equal(result.status,403);
sql.prepare("UPDATE relationships SET score=2 WHERE user_id='u' AND creator_id='c'").run();
result=await request('/api/chats/c/episode',{method:'POST',data:{episodeId:'ep2'}});assert.equal(result.payload.chat.episodeId,'ep2');
result=await request('/api/chats/c/episode',{method:'POST',data:{episodeId:'ep1'}});assert.equal(result.payload.chat.revisionId,'r1');assert.equal(result.payload.chat.history[0].text,'First revision');
sql.prepare("UPDATE revisions SET status='suspended' WHERE id='r1'").run();assert.equal((await request('/api/chats/c')).status,403);
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='test';
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const jwtHead=enc({alg:'RS256',kid:'test'}),jwtBody=enc({iss:'https://access.example.com',aud:['app'],email:'admin@example.com',exp:Math.floor(now/1000)+3600});
const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(jwtHead+'.'+jwtBody));
const jwt=jwtHead+'.'+jwtBody+'.'+Buffer.from(sig).toString('base64url');
const adminRaw='b'.repeat(64),adminHash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(adminRaw))).toString('hex');
sql.prepare("INSERT INTO users(id,email,google_id,created_at) VALUES('a','admin@example.com','admin-google',?)").run(now);
sql.prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,'a',?)").run(adminHash,now+100000);
sql.prepare("INSERT INTO users(id,email,google_id,created_at) VALUES('old','old@example.com','old-google',?)").run(now-20*86400000);
sql.prepare("INSERT INTO activity(user_id,kind,created_at) VALUES('old','feed',?),('old','feed',?),('old','dm_start',?),('old','dm',?),('old','dm_end',?)").run(now-20*86400000,now-12*86400000,now-19*86400000,now-18*86400000,now-18*86400000);
sql.prepare("INSERT INTO users(id,email,google_id,created_at) VALUES('boundary','boundary@example.com','boundary-google',?)").run(now-20*86400000);
sql.prepare("INSERT INTO activity(user_id,kind,created_at) VALUES('boundary','feed',?),('boundary','feed',?)").run(now-20*86400000,now-6*86400000);
env.ACCESS_TEAM_DOMAIN='access.example.com';env.ACCESS_AUDIENCE='app';
const originalFetch=globalThis.fetch;globalThis.fetch=async url=>String(url)==='https://access.example.com/cdn-cgi/access/certs'?new Response(JSON.stringify({keys:[jwk]}),{status:200}):originalFetch(url);
const metricResponse=await worker.fetch(new Request(env.PUBLIC_ORIGIN+'/api/admin/metrics',{headers:{cookie:'frost_session='+adminRaw,'cf-access-jwt-assertion':jwt}}),env);assert.equal(metricResponse.status,200);const metrics=await metricResponse.json();assert.equal(metrics.eligible14,2);assert.equal(metrics.returned7to14,1);assert.equal(metrics.dmStarted,2);assert.equal(metrics.dmContinuedAnotherDay,1);assert.equal(metrics.dmCompleted,2);assert.equal(metrics.dayTimezone,'Asia/Bangkok');globalThis.fetch=originalFetch;
result=await request('/api/account',{method:'DELETE'});assert.equal(result.status,200);assert.equal((await request('/api/me')).status,401);assert.equal(sql.prepare('SELECT count(*) count FROM comments').get().count,0);assert.equal(sql.prepare('SELECT count(*) count FROM invites').get().count,0);
// Test Studio Passcode & Email/Password Authentication
let loginRes = await request('/auth/login', { method: 'POST', data: { studioKey: 'wrong_key' } });
assert.equal(loginRes.status, 401);
loginRes = await request('/auth/login', { method: 'POST', data: { studioKey: 'frost2026' } });
assert.equal(loginRes.status, 200);
assert.equal(loginRes.payload.user.role, 'admin');

let regRes = await request('/auth/register', { method: 'POST', data: { email: 'player1@test.com', password: 'secret123' } });
assert.equal(regRes.status, 200);
assert.equal(regRes.payload.user.email, 'player1@test.com');

let playerLogin = await request('/auth/login', { method: 'POST', data: { email: 'player1@test.com', password: 'wrongpassword' } });
assert.equal(playerLogin.status, 401);
playerLogin = await request('/auth/login', { method: 'POST', data: { email: 'player1@test.com', password: 'secret123' } });
assert.equal(playerLogin.status, 200);

let guestRes = await request('/auth/guest', { method: 'POST' });
assert.equal(guestRes.status, 200);
assert.equal(guestRes.payload.user.role, 'player');

console.log('Worker API authentication, comments, stories, revision and deletion checks passed');
