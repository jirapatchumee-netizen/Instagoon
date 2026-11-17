import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECALL_TRIGGER_REGEX,
  shouldRecallMemory,
  quantizeEmbedding,
  cosineSimilarityInt8,
  scoreMemory,
  rankMemories,
  formatMemoriesForPrompt
} from '../src/ai/episodic-memory.mjs';
import { narrativeFixture } from './helpers/narrative-fixture.mjs';

test('episodic-memory: shouldRecallMemory fast gate logic', () => {
  // Positive cues in Thai
  assert.equal(shouldRecallMemory({ userText: 'จำได้ไหมว่าวันแรกที่เราเจอกันเนยใส่ชุดอะไร?' }), true);
  assert.equal(shouldRecallMemory({ userText: 'สัญญาว่าจะพาไปเที่ยวทะเลยังจำได้ป่ะ' }), true);
  assert.equal(shouldRecallMemory({ userText: 'ตอนที่เราติดฝนด้วยกันวันนั้นสนุกดีนะ' }), true);
  assert.equal(shouldRecallMemory({ userText: 'ไปกินร้านเดิมกันไหม' }), true);
  assert.equal(shouldRecallMemory({ userText: 'คราวก่อนที่เนยบอกว่าชอบแมว' }), true);

  // Positive cues in English
  assert.equal(shouldRecallMemory({ userText: 'Do you remember what you promised me?' }), true);
  assert.equal(shouldRecallMemory({ userText: 'Last time we met at the coffee shop' }), true);

  // Negative cues (routine chat - fast path 0ms overhead)
  assert.equal(shouldRecallMemory({ userText: 'สวัสดีตอนเช้าครับเนย วันนี้ตื่นสายไหม' }), false);
  assert.equal(shouldRecallMemory({ userText: '55555555555 ขำมากเลยอะ' }), false);
  assert.equal(shouldRecallMemory({ userText: 'กินข้าวเที่ยงหรือยังครับ' }), false);
  assert.equal(shouldRecallMemory({ userText: 'ฝันดีนะ พรุ่งนี้เจอกัน' }), false);
  assert.equal(shouldRecallMemory({ userText: '' }), false);
  assert.equal(shouldRecallMemory({ userText: null }), false);

  // Scene transition trigger
  assert.equal(shouldRecallMemory({ userText: 'ไปกันเถอะ', isSceneTransition: true }), true);

  // Periodic substantive trigger
  assert.equal(shouldRecallMemory({ userText: 'ช่วงนี้รู้สึกเหนื่อยกับงานมากเลย อยากหาเวลาพักผ่อนยาวๆ', messagesSinceLastRecall: 15 }), true);
  assert.equal(shouldRecallMemory({ userText: 'โอเค', messagesSinceLastRecall: 15 }), false);
  assert.equal(shouldRecallMemory({ userText: 'ช่วงนี้รู้สึกเหนื่อยกับงานมากเลย อยากหาเวลาพักผ่อนยาวๆ', messagesSinceLastRecall: 5 }), false);
});

test('episodic-memory: Matryoshka truncation and Int8 quantization', () => {
  // Synthetic 768-dim float vector
  const original768 = new Float32Array(768);
  for (let i = 0; i < 768; i++) {
    original768[i] = Math.sin(i * 0.1) * (1 / (1 + i * 0.01));
  }

  const quantized = quantizeEmbedding(original768, 128);
  assert.equal(quantized instanceof Uint8Array, true);
  assert.equal(quantized.byteLength, 128, 'Truncates to exactly 128 bytes');

  // Verify non-zero contents
  const nonZeros = quantized.filter(b => b !== 0);
  assert.ok(nonZeros.length > 50, 'Preserves meaningful non-zero dimensions');

  // Self-similarity should be ~1.0
  const simSelf = cosineSimilarityInt8(quantized, quantized);
  assert.ok(simSelf >= 0.99 && simSelf <= 1.0, `Self-similarity should be ~1.0, got ${simSelf}`);
});

test('episodic-memory: cosineSimilarityInt8 orthogonal and opposing vectors', () => {
  // Vector A: all positive along first 64 dims
  const a = new Int8Array(128);
  for (let i = 0; i < 64; i++) a[i] = 50;

  // Vector B: all positive along second 64 dims (orthogonal to A)
  const b = new Int8Array(128);
  for (let i = 64; i < 128; i++) b[i] = 50;

  const simOrthogonal = cosineSimilarityInt8(new Uint8Array(a.buffer), new Uint8Array(b.buffer));
  assert.equal(simOrthogonal, 0, 'Orthogonal vectors have 0 similarity');

  // Vector C: exact opposite of A
  const c = new Int8Array(128);
  for (let i = 0; i < 64; i++) c[i] = -50;

  const simOpposite = cosineSimilarityInt8(new Uint8Array(a.buffer), new Uint8Array(c.buffer));
  assert.ok(simOpposite <= -0.99, `Opposite vectors should be ~ -1.0, got ${simOpposite}`);
});

test('episodic-memory: scoreMemory composite formula with recency decay', () => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const recentHighImportance = scoreMemory({
    similarity: 0.8,
    importance: 5,
    createdAt: now - (1 * dayMs),
    now
  });

  const oldHighImportance = scoreMemory({
    similarity: 0.8,
    importance: 5,
    createdAt: now - (60 * dayMs),
    now
  });

  assert.ok(recentHighImportance > oldHighImportance, 'Recent memory must score higher than 60-day old memory with identical similarity and importance');

  const lowImportance = scoreMemory({
    similarity: 0.8,
    importance: 1,
    createdAt: now - (1 * dayMs),
    now
  });

  assert.ok(recentHighImportance > lowImportance, 'High importance memory must score higher than low importance');
});

test('episodic-memory: rankMemories and formatMemoriesForPrompt', () => {
  const now = Date.now();
  const query = new Uint8Array(128);
  for (let i = 0; i < 128; i++) query[i] = 20;

  // Matching memory (similar direction)
  const matchEmb = new Uint8Array(128);
  for (let i = 0; i < 128; i++) matchEmb[i] = 25;

  // Unrelated memory (orthogonal)
  const unrelatedEmb = new Uint8Array(128);
  for (let i = 0; i < 64; i++) unrelatedEmb[i] = 20;
  for (let i = 64; i < 128; i++) unrelatedEmb[i] = -20;

  const candidates = [
    {
      id: 'mem-1',
      kind: 'promise',
      fact_text: 'เนยสัญญาว่าจะทำคุ้กกี้มาให้ชิม',
      importance: 5,
      embedding: matchEmb,
      created_at: now,
      last_recalled_at: null
    },
    {
      id: 'mem-2',
      kind: 'event',
      fact_text: 'เดินเล่นที่สยามตอนฝนตก',
      importance: 3,
      embedding: unrelatedEmb,
      created_at: now,
      last_recalled_at: null
    }
  ];

  const ranked = rankMemories(candidates, query, now, 2);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].memory.id, 'mem-1', 'Most similar & important memory ranks first');

  const formatted = formatMemoriesForPrompt(ranked);
  assert.equal(formatted.length, 2);
  assert.ok(formatted[0].includes('[คำสัญญา]'), 'Includes Thai kind label');
  assert.ok(formatted[0].includes('เนยสัญญาว่าจะทำคุ้กกี้มาให้ชิม'));
  assert.ok(formatted[0].includes('5/5'));
});

test('episodic-memory: D1 migration 0037 and strict multi-tenancy isolation', async () => {
  const f = await narrativeFixture();
  const now = Date.now();
  const dummyEmbedding = new Uint8Array(128).fill(10);

  // User 'one' has an episodic memory with creator 'npc'
  f.sql.prepare(`
    INSERT INTO episodic_memories (id, user_id, creator_id, kind, fact_text, importance, created_at, embedding)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('mem-user1', 'one', f.npc.id, 'promise', 'สัญญาลับเฉพาะคนแรก', 5, now, dummyEmbedding);

  // Querying for user 'one' returns the memory
  const user1Rows = f.sql.prepare('SELECT id, fact_text, embedding FROM episodic_memories WHERE user_id=? AND creator_id=?').all('one', f.npc.id);
  assert.equal(user1Rows.length, 1);
  assert.equal(user1Rows[0].fact_text, 'สัญญาลับเฉพาะคนแรก');
  assert.equal(user1Rows[0].embedding.byteLength, 128, 'Stored embedding BLOB is exactly 128 bytes');

  // Querying for user 'two' returns NOTHING (Strict Data Isolation)
  const user2Rows = f.sql.prepare('SELECT id, fact_text FROM episodic_memories WHERE user_id=? AND creator_id=?').all('two', f.npc.id);
  assert.equal(user2Rows.length, 0, 'User two must never see User one memories');

  // CASCADE check: Deleting user 'one' should automatically cascade and delete episodic_memories
  f.sql.prepare('DELETE FROM users WHERE id=?').run('one');
  const postDeleteRows = f.sql.prepare('SELECT COUNT(*) as cnt FROM episodic_memories WHERE user_id=?').get('one');
  assert.equal(postDeleteRows.cnt, 0, 'Episodic memory must cascade delete with user');
});

test('episodic-memory: reset-chat endpoint clears episodic_memories for user and creator', async () => {
  const f = await narrativeFixture();
  const now = Date.now();
  const dummyEmbedding = new Uint8Array(128).fill(15);

  f.sql.prepare(`
    INSERT INTO episodic_memories (id, user_id, creator_id, kind, fact_text, importance, created_at, embedding)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('mem-reset-test', 'one', f.npc.id, 'event', 'ข้อความก่อนรีเซ็ต', 3, now, dummyEmbedding);

  assert.equal(f.sql.prepare('SELECT COUNT(*) as n FROM episodic_memories WHERE user_id=?').get('one').n, 1);

  // Call POST /api/chats/:creator/reset-chat
  const res = await f.request('', { uid: 'one', action: 'reset-chat' });
  assert.equal(res.status, 200);
  assert.equal(res.payload.ok, true);

  // Assert memory is cleared
  assert.equal(f.sql.prepare('SELECT COUNT(*) as n FROM episodic_memories WHERE user_id=?').get('one').n, 0);
});

