import test from 'node:test';
import assert from 'node:assert/strict';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';

// The DM lane ships text only. Reward art is reachable through the Story lane and the
// Close Friends Vault, so a qualifying reward must never attach media to a chat message.
async function inlineWithRewards() {
  const f = await narrativeFixture();
  const npc = { ...f.npc, world: 'ร้านขนมหลังมหาวิทยาลัย', rewards: [
    { id: 'r-lv2', name: 'ชุดแมว', asset: 'assets/r_lv2.png', conditions: [{ field: 'level', value: 2 }] },
    { id: 'r-lv3', name: 'ดึก', asset: 'assets/r_lv3.png', conditions: [{ field: 'level', value: 3 }] }
  ] };
  delete npc.narrative;
  f.sql.prepare('UPDATE npc_definitions SET definition_json=? WHERE creator_id=?').run(JSON.stringify(npc), npc.id);
  f.env.PRIMARY_AI_PROVIDER = 'workers-ai';
  f.env.AI = { async run() {
    return { response: JSON.stringify({ reply: 'ว่าไงน้า', innerThought: 'อยากแกล้ง', action: 'โบกมือ', sceneTime: '18:42 น.' }) };
  } };
  return { f, npc };
}

test('a DM reply stores no media even when the player qualifies for several rewards', async () => {
  const { f, npc } = await inlineWithRewards();
  f.sql.prepare('INSERT INTO relationships(user_id,creator_id,closeness,trust,romance,score,turns) VALUES(?,?,?,?,?,?,?)')
    .run('one', npc.id, 70, 70, 70, 70, 20);

  const first = await f.request('สวัสดีค่ะ');
  assert.equal(first.status, 200);
  assert.equal(first.payload.mediaKey, null);

  const row = f.sql.prepare("SELECT media_key FROM ai_chat_messages WHERE role='assistant' AND creator_id=? ORDER BY created_at DESC LIMIT 1").get(npc.id);
  assert.equal(row.media_key, null);

  const second = await f.request('คิดถึงนะ');
  assert.equal(second.payload.mediaKey, null);
  assert.deepEqual(second.payload.messages.filter(m => m.role === 'assistant').map(m => m.mediaKey), [null, null]);
});

test('the vault keeps owning reward media and its unlock path is unchanged', async () => {
  const { f, npc } = await inlineWithRewards();
  await f.request('สวัสดีค่ะ');

  const profile = await f.request('', { action: '' });
  assert.equal(profile.status, 200);

  const locked = await f.request('', { action: 'rewards/unlock', data: { mediaKey: 'assets/r_lv2.png', method: 'energy' } });
  assert.equal(locked.status, 200);
  assert.equal(locked.payload.unlocked, true);
  assert.ok(f.sql.prepare('SELECT 1 ok FROM reward_unlocks WHERE user_id=? AND reward_key=?').get('one', 'assets/r_lv2.png'));

  const after = await f.request('', { action: '' });
  assert.ok(after.payload.chat.unlockedRewards.includes('assets/r_lv2.png'), 'vault state still tracks the unlock');
  assert.equal(after.payload.chat.aiMessages.filter(m => m.mediaKey).length, 0, 'no DM message ever carries media');
});
