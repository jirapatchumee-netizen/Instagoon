import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const { createServer } = await import(require.resolve('vite'));
const server = await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()+'/src'}},server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
try {
 const { OVERTIME_PROJECT } = await server.ssrLoadModule('/src/demo/loadOvertime.ts');
 const { VNEngine } = await server.ssrLoadModule('/src/engine/core/VNEngine.ts');
 globalThis.window = {setTimeout,clearTimeout};
 const badChoices = ['EP1_after_hours/230','EP2_hidden_frame/300','EP3_blind_spot/210','EP4_the_secretary/190','EP5_true_exposure/250'];
 async function run(bad, shadow=false, lie=false, tamper=false) {
  let e=new VNEngine(OVERTIME_PROJECT,true); e.settings.textSpeed=0; e.start();
  let retried=false, saved=false; const visited=new Set(), nodes=new Set();
  for(let step=0;step<3000;step++) {
   const s=e.getState(), n=s.currentNode; assert.ok(n,'no current node'); visited.add(n.id.split('/')[0]); nodes.add(n.id);
   if(s.isEnded) {
    if(n.retryNodeId && bad && !retried){
      assert.equal(n.retryNodeId,bad);
      assert.equal(s.retryNodeId,bad,'retry unavailable');
      e.retryCheckpoint(bad); assert.equal(e.getState().currentNode.id,bad); retried=true; continue;
    }
    assert.ok(s.endingName.includes(shadow?'SHADOW END':'TRUE END'),s.endingName);
    assert.deepEqual([...visited].filter(x=>x.startsWith('EP')).sort(),['EP1_after_hours','EP2_hidden_frame','EP3_blind_spot','EP4_the_secretary','EP5_true_exposure']);
    assert.equal(retried,!!bad); assert.ok(nodes.has(tamper ? 'EP3_blind_spot/185' : 'EP3_blind_spot/186'), 'wrong Echo Mind consequence');
    return {ending:s.endingName, visited:visited.size, saved};
   }
   if(n.type==='dialogue') {
    if(!saved && n.id.startsWith('EP4_')) {
      await e.saveToSlot('test'); const data=await e.saveManager.load('test'); assert.ok(data); const restored=new VNEngine(OVERTIME_PROJECT,true);restored.settings.textSpeed=0;restored.applySaveData(data);e=restored;saved=true;
    }
    e.step();
   } else if(n.type==='choice') {
    let index=0;
    if(n.id===bad && !retried) index=2;
    else if(n.id==='EP5_true_exposure/250' && shadow) index=1;
    else if(n.id==='EP3_blind_spot/210' && lie) index=1;
    else if(n.id==='EP2_hidden_frame/300' && tamper) index=1;
    if(lie && n.id==='EP5_true_exposure/250') { assert.equal(e.evalCondition(n.options[0].condition),false); index=1; shadow=true; }
    e.makeChoice(index);
    assert.notEqual(e.getState().currentNode?.id,n.id,`stuck choice ${n.id} option ${index}`);
   } else throw Error('unexpected interactive type '+n.type);
  }
  throw Error('step limit');
 }
 for(const bad of [null,...badChoices]) console.log(JSON.stringify({bad,...await run(bad)}));
 console.log(JSON.stringify({shadow:true,...await run(null,true,false,true)}));
 console.log(JSON.stringify({lie:true,...await run(null,false,true,false)}));
} finally { await server.close(); }
