import test from 'node:test';
import assert from 'node:assert/strict';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';

// The Workers AI fallback uses a chat model in JSON mode and reads the OpenAI-style reply newer models return.
test('Workers AI fallback asks the chat model for JSON and reads choices[0].message.content', async () => {
  const f = await narrativeFixture();
  const npc = { ...f.npc }; delete npc.narrative;
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(npc), npc.id);
  f.env.PRIMARY_AI_PROVIDER = 'workers-ai';
  const calls = [];
  f.env.AI = { async run(model, input) {
    calls.push({ model, input });
    return { choices: [{ message: { role: 'assistant', content: JSON.stringify({ reply: 'เค้าเพิ่งกลับจากงานเลย', innerThought: 'เหนื่อยแต่ดีใจ', action: 'ยิ้ม' }) } }] };
  } };
  const r = await f.request('ไปงานมาเหรอ');
  assert.equal(r.status, 200, JSON.stringify(r.payload));
  assert.equal(r.payload.reply, 'เค้าเพิ่งกลับจากงานเลย');
  assert.equal(calls[0].model, '@cf/meta/llama-4-scout-17b-16e-instruct');
  assert.deepEqual(calls[0].input.response_format, { type: 'json_object' });
});
