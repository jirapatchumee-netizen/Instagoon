import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(process.cwd()+'/package.json');
const {createServer}=await import(require.resolve('vite'));
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()+'/src'}},server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},appType:'custom',logLevel:'error'});
try {
 const {VNEngine}=await server.ssrLoadModule('/src/engine/core/VNEngine.ts');
 const {SaveManager}=await server.ssrLoadModule('/src/engine/storage/SaveManager.ts');
 globalThis.window={setTimeout,clearTimeout};
 const p={id:'test',meta:{title:'test',author:'test',version:'1'},characters:{},backgrounds:{},audio:{},initialVariables:{trust:0},startNodeId:'a',nodes:{
 a:{id:'a',type:'dialogue',text:'First',nextId:'choice'},
 choice:{id:'choice',type:'choice',options:[{id:'x',label:'yes',setVariables:{trust:9},targetNodeId:'set'}]},
 set:{id:'set',type:'set_variable',variableName:'other',operation:'set',value:1,nextId:'b'},
 b:{id:'b',type:'dialogue',text:'Next',nextId:'end'},end:{id:'end',type:'end',endingName:'end'}}};
 const e=new VNEngine(p,true);e.settings.textSpeed=0;e.start();e.step();assert.equal(e.getState().currentNode.id,'choice');e.makeChoice(0);assert.equal(e.getState().variables.trust,9);assert.equal(e.getState().variables.other,1);assert.equal(e.getState().currentNode.id,'b');assert.ok(e.rollback());assert.equal(e.getState().currentNode.id,'choice');assert.equal(e.getState().variables.trust,0);assert.equal(e.getState().variables.other,undefined);assert.ok(e.rollback());assert.equal(e.getState().currentNode.id,'a');assert.deepEqual(e.getState().history.map(x=>x.text),['First']);await e.saveToSlot('x');let saved=await e.saveManager.load('x');e.applySaveData(saved);assert.deepEqual(e.getState().history.map(x=>x.text),['First']);assert.throws(()=>e.applySaveData({...saved,currentNodeId:'removed'}));assert.equal(e.getState().currentNode.id,'a');console.log('PASS: rollback restores pre-choice variables across set nodes and load does not duplicate history'); e.dispose();
 const values=new Map(); globalThis.localStorage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k),key:i=>[...values.keys()][i]??null,get length(){return values.size}};
 const store=new SaveManager('storage-test'); await store.save('1',{currentNodeId:'a',variables:{trust:1},history:[]}); assert.equal((await store.load('1')).variables.trust,1);assert.equal((await store.listSlots()).length,1);
 globalThis.localStorage.setItem=()=>{throw Error('quota')};await assert.rejects(store.save('2',{currentNodeId:'a',variables:{},history:[]}));assert.equal((await store.load('1')).variables.trust,1);console.log('PASS: local fallback persists saves and reports storage failure');
} finally { await server.close(); }
