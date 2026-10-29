with open('apps/froststory/worker/src/index.mjs') as f:
    content = f.read()

start_marker = "   const creatorData = await one(env, 'SELECT * FROM creators WHERE id=?', creator);\n   if(!creatorData) return json({error:'not_found'}, 404);"

end_marker = """   return json({
     ok: true,
     reply: replyText,
     mediaKey: rewardMediaKey,
     messages: allAiMessages,
     relationship: newScore,
     energy: await energy(env, user.id, now)
   });
  }"""

assert start_marker in content, "start_marker not found"
assert end_marker in content, "end_marker not found"

replacement = """   const creatorData = await one(env, 'SELECT * FROM creators WHERE id=?', creator);
   if(!creatorData) return json({error:'not_found'}, 404);

   const npcDefRow = await one(env, 'SELECT definition_json FROM npc_definitions WHERE creator_id=?', creator);
   let npcDef = null;
   if(npcDefRow?.definition_json){try{npcDef=JSON.parse(npcDefRow.definition_json);}catch(e){}}

   const relRow = await one(env, 'SELECT score, closeness, trust, romance, turns, events_json, rule_uses_json FROM relationships WHERE user_id=? AND creator_id=?', user.id, creator);
   let closeness = relRow?.closeness || 0, trust = relRow?.trust || 0, romance = relRow?.romance || 0, turnCount = (relRow?.turns || 0) + 1;
   let events = {}, ruleUses = {};
   try{events=JSON.parse(relRow?.events_json||'{}');}catch(e){}
   try{ruleUses=JSON.parse(relRow?.rule_uses_json||'{}');}catch(e){}

   const weights = npcDef?.relationship?.weights || { closeness: 40, trust: 40, romance: 20 };
   const romanceEnabled = npcDef?.relationship?.romanceEnabled !== false;
   const activeWeights = romanceEnabled ? weights : { closeness: weights.closeness, trust: weights.trust, romance: 0 };
   const totalWeight = (activeWeights.closeness || 0) + (activeWeights.trust || 0) + (activeWeights.romance || 0);
   let rel = totalWeight > 0 ? Math.round((((closeness * (activeWeights.closeness || 0)) + (trust * (activeWeights.trust || 0)) + (romance * (activeWeights.romance || 0))) / totalWeight) * 100) / 100 : (relRow?.score || 0);
   const thresholds = npcDef?.relationship?.thresholds || [0, 20, 40, 60, 80];
   let currentLv = 0;
   for(const th of thresholds){if(rel >= th) currentLv++;}
   currentLv = Math.max(1, Math.min(5, currentLv));

   await run(env, 'INSERT INTO ai_chat_messages(id, user_id, creator_id, role, content, created_at) VALUES(?,?,?,?,?,?)', crypto.randomUUID(), user.id, creator, 'user', userText, now);

   const memRows = await all(env, 'SELECT key, value FROM player_memories WHERE user_id=? AND creator_id=?', user.id, creator);
   const memText = memRows.length > 0 ? memRows.map(m => `${m.key}: ${m.value}`).join(', ') : 'ยังไม่มีข้อมูลพิเศษ';
   const recentRows = await all(env, 'SELECT role, content FROM ai_chat_messages WHERE user_id=? AND creator_id=? ORDER BY created_at DESC LIMIT 6', user.id, creator);
   const recentHistory = recentRows.reverse().map(r => `${r.role === 'user' ? 'Player' : (npcDef?.name || creatorData.name)}: ${r.content}`).join('\\n');

   const lowerText = userText.toLowerCase();
   const matchedRuleIds = [];
   if(npcDef?.rules){
     for(const r of npcDef.rules){
       if(r.kind === 'keyword' && Array.isArray(r.keywords)){
         if(r.keywords.some(k => k && lowerText.includes(String(k).toLowerCase().trim()))){
           matchedRuleIds.push(r.id);
         }
       }
     }
   }

   const availableSecrets = (npcDef?.secrets || []).filter(s => currentLv >= (s.minLevel || 1));
   const secretsPrompt = availableSecrets.length > 0
     ? `Available secrets you can reveal naturally if asked: [${availableSecrets.map(s => s.content).join('; ')}]`
     : 'Do NOT reveal any hidden secrets yet as trust is still building.';
   const currentStyle = (npcDef?.style?.levelStyles && npcDef.style.levelStyles[currentLv - 1]) || 'เป็นธรรมชาติ อบอุ่น';
   const semanticRules = (npcDef?.rules || []).filter(r => r.kind === 'semantic');
   const rulesPrompt = semanticRules.length > 0
     ? `Semantic rules to detect: ${semanticRules.map(r => `"${r.id}" (${r.description})`).join(', ')}`
     : '';

   let replyText = '';
   let scoreDelta = 1;
   let newMem = null;
   let detectedRuleIds = [...matchedRuleIds];

   const systemPrompt = `You are roleplaying as "${npcDef?.name || creatorData.name}", an authentic idol/creator chatting on instagoon private DM.
Tagline: "${npcDef?.tagline || ''}".
Bio: "${npcDef?.biography || creatorData.bio}".
Personality: "${npcDef?.personality || ''}".
Likes: "${npcDef?.likes || ''}", Dislikes: "${npcDef?.dislikes || ''}".
Goals: "${npcDef?.goals || ''}".
Immutable facts: [${(npcDef?.immutableFacts || []).join('; ')}].
Knowledge boundary: "${npcDef?.knowledgeBoundary || ''}".
Relationship: Closeness ${closeness}/100, Trust ${trust}/100, Romance ${romance}/100 (Overall Score: ${rel}/100, Level ${currentLv}/5).
Current Style for Level ${currentLv}: "${currentStyle}".
${secretsPrompt}
Known facts about player: [${memText}].
Recent DM history:
${recentHistory}
Player says: "${userText}".
${rulesPrompt}
Reply in Thai naturally as "${npcDef?.name || creatorData.name}" (1-3 conversational sentences like Instagram DM).
Output STRICT JSON format: {"reply": "Thai text", "matchedRuleIds": ["id1", ...], "affectionDelta": 1 to 3, "learnedMemory": {"key": "player.xxx", "value": "xxx"} or null}`;

   if (env.GEMINI_API_KEY && !replyText) {
     try {
       const geminiModel = env.GEMINI_MODEL || 'gemini-2.5-flash';
       const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'x-goog-api-key': env.GEMINI_API_KEY
         },
         body: JSON.stringify({
           contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
           generationConfig: { responseMimeType: 'application/json' }
         })
       });
       if(res.ok) {
         const data = await res.json();
         const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
         if(raw) {
           const parsed = JSON.parse(raw);
           if(parsed.reply) replyText = parsed.reply;
           if(Array.isArray(parsed.matchedRuleIds)) detectedRuleIds.push(...parsed.matchedRuleIds);
           if(parsed.affectionDelta) scoreDelta = Math.min(3, Math.max(1, Number(parsed.affectionDelta)));
           if(parsed.learnedMemory?.key && parsed.learnedMemory?.value) newMem = parsed.learnedMemory;
         }
       }
     } catch(e) {}
   }

   if (env.AI_API_KEY && !replyText) {
     try {
       const baseUrl = env.AI_BASE_URL || 'https://api.openai.com/v1';
       const res = await fetch(`${baseUrl}/chat/completions`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.AI_API_KEY}` },
         body: JSON.stringify({
           model: env.AI_MODEL || 'gpt-4o-mini',
           messages: [{ role: 'user', content: systemPrompt }],
           response_format: { type: 'json_object' }
         })
       });
       if(res.ok) {
         const data = await res.json();
         const raw = data.choices?.[0]?.message?.content;
         if(raw) {
           const parsed = JSON.parse(raw);
           if(parsed.reply) replyText = parsed.reply;
           if(Array.isArray(parsed.matchedRuleIds)) detectedRuleIds.push(...parsed.matchedRuleIds);
           if(parsed.affectionDelta) scoreDelta = Math.min(3, Math.max(1, Number(parsed.affectionDelta)));
           if(parsed.learnedMemory?.key && parsed.learnedMemory?.value) newMem = parsed.learnedMemory;
         }
       }
     } catch(e) {}
   }

   if(!replyText) {
     replyText = npcDef?.style?.fallback || `ขอบคุณที่ทักมาคุยนะคะ 😊 วันนี้งานทางนู้นเหนื่อยไหมคะ?`;
   }

   if (newMem && newMem.key && newMem.value) {
     await run(env, 'INSERT OR REPLACE INTO player_memories(user_id, creator_id, key, value, created_at) VALUES(?,?,?,?,?)', user.id, creator, String(newMem.key), String(newMem.value), now);
   }

   const finalDetectedRules = Array.from(new Set(detectedRuleIds));
   if (npcDef?.rules) {
     for (const r of npcDef.rules) {
       if (finalDetectedRules.includes(r.id)) {
         events[r.id] = (events[r.id] || 0) + 1;
         const uses = ruleUses[r.id] || 0;
         if (r.maxUses === 0 || uses < r.maxUses) {
           closeness = Math.min(100, Math.max(0, closeness + (r.changes?.closeness || 0)));
           trust = Math.min(100, Math.max(0, trust + (r.changes?.trust || 0)));
           romance = Math.min(100, Math.max(0, romance + (r.changes?.romance || 0)));
           ruleUses[r.id] = uses + 1;
         }
       }
     }
     rel = totalWeight > 0 ? Math.round((((closeness * (activeWeights.closeness || 0)) + (trust * (activeWeights.trust || 0)) + (romance * (activeWeights.romance || 0))) / totalWeight) * 100) / 100 : rel;
     let newLv = 0;
     for (const th of thresholds) { if (rel >= th) newLv++; }
     currentLv = Math.max(1, Math.min(5, newLv));
   } else {
     rel = Math.min(100, rel + scoreDelta);
   }

   let rewardMediaKey = null;
   let rewardMsg = null;
   if (npcDef?.rewards) {
     for (const rew of npcDef.rewards) {
       const already = await one(env, 'SELECT 1 FROM reward_unlocks WHERE user_id=? AND creator_id=? AND reward_key=?', user.id, creator, rew.asset);
       if (already) continue;
       let passed = true;
       for (const cond of (rew.conditions || [])) {
         if (cond.field === 'level' && currentLv < (cond.value || 0)) passed = false;
         if (cond.field === 'closeness' && closeness < (cond.value || 0)) passed = false;
         if (cond.field === 'trust' && trust < (cond.value || 0)) passed = false;
         if (cond.field === 'romance' && romance < (cond.value || 0)) passed = false;
         if (cond.field === 'event') {
           const count = events[cond.eventId] || 0;
           const reqCount = Math.max(1, cond.value || 1);
           if (count < reqCount) passed = false;
         }
         if (cond.field === 'turns' && turnCount < (cond.value || 0)) passed = false;
       }
       if (passed) {
         rewardMediaKey = rew.asset;
         rewardMsg = rew.message;
         await run(env, 'INSERT OR IGNORE INTO reward_unlocks(user_id, creator_id, reward_key, unlocked_at) VALUES(?,?,?,?)', user.id, creator, rew.asset, now);
         break;
       }
     }
   } else if (rel >= 20 && (rel - scoreDelta) < 20) {
     rewardMediaKey = 'rewards/noey_special_smile.webp';
     rewardMsg = 'เนยแอบส่งรูปพิเศษให้คุณเป็นรางวัลที่สนิทกันมากขึ้นนะคะ 💕';
     await run(env, 'INSERT OR IGNORE INTO reward_unlocks(user_id, creator_id, reward_key, unlocked_at) VALUES(?,?,?,?)', user.id, creator, rewardMediaKey, now);
   }

   if (rewardMediaKey && rewardMsg) {
     replyText += `\\n\\n📸 (${rewardMsg})`;
   }

   await run(env, 'INSERT INTO relationships(user_id, creator_id, score, closeness, trust, romance, turns, events_json, rule_uses_json) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id, creator_id) DO UPDATE SET score=excluded.score, closeness=excluded.closeness, trust=excluded.trust, romance=excluded.romance, turns=excluded.turns, events_json=excluded.events_json, rule_uses_json=excluded.rule_uses_json', user.id, creator, rel, closeness, trust, romance, turnCount, JSON.stringify(events), JSON.stringify(ruleUses));

   await run(env, 'INSERT INTO ai_chat_messages(id, user_id, creator_id, role, content, media_key, affection_delta, created_at) VALUES(?,?,?,?,?,?,?,?)', crypto.randomUUID(), user.id, creator, 'assistant', replyText, rewardMediaKey, scoreDelta, now + 1);
   await run(env, 'INSERT INTO activity(user_id, kind, created_at) VALUES(?,?,?)', user.id, 'dm', now);

   const allAiMessages = await all(env, 'SELECT id, role, content, media_key mediaKey, affection_delta affectionDelta, created_at createdAt FROM ai_chat_messages WHERE user_id=? AND creator_id=? ORDER BY created_at ASC LIMIT 100', user.id, creator);

   return json({
     ok: true,
     reply: replyText,
     mediaKey: rewardMediaKey,
     messages: allAiMessages,
     relationship: rel,
     closeness,
     trust,
     romance,
     level: currentLv,
     energy: await energy(env, user.id, now)
   });
  }"""

idx_start = content.index(start_marker)
idx_end = content.index(end_marker) + len(end_marker)

new_content = content[:idx_start] + replacement + content[idx_end:]
with open('apps/froststory/worker/src/index.mjs', 'w') as f:
    f.write(new_content)

print('Updated cognitive engine in apps/froststory/worker/src/index.mjs successfully!')
