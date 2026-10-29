import test from 'node:test';
import assert from 'node:assert/strict';
import {selectKnowledge} from '../src/knowledge.mjs';
test('knowledge aliases are scoped and can be disabled',()=>{const npc={knowledge:[{title:'เนเน่',aliases:['Nene'],content:'นักร้อง',source:'https://example.org'}]};assert.equal(selectKnowledge(npc,'รู้จัก NENE ไหม').length,1);assert.equal(selectKnowledge({...npc,knowledgeEnabled:false},'เนเน่').length,0);assert.equal(selectKnowledge({knowledge:[]},'เนเน่').length,0);});
