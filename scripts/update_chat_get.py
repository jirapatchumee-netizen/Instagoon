with open('apps/froststory/worker/src/index.mjs') as f:
    content = f.read()

target = """  const score=(await one(env,'SELECT score FROM relationships WHERE user_id=? AND creator_id=?',user.id,creator))?.score||0;
  const episodes=await all(env,`SELECT e.*,s.current_node_id,s.revision_id FROM episodes e LEFT JOIN chat_states s ON s.episode_id=e.id AND s.user_id=? WHERE e.creator_id=? AND EXISTS(SELECT 1 FROM revisions r WHERE r.episode_id=e.id AND r.status='published') ORDER BY e.position,e.id`,user.id,creator);"""

replacement = """  const allAiMessages = await all(env, 'SELECT id, role, content, media_key mediaKey, affection_delta affectionDelta, created_at createdAt FROM ai_chat_messages WHERE user_id=? AND creator_id=? ORDER BY created_at ASC LIMIT 100', user.id, creator);
  const memList = await all(env, 'SELECT key, value, created_at createdAt FROM player_memories WHERE user_id=? AND creator_id=? ORDER BY created_at DESC', user.id, creator);
  const relRow = await one(env, 'SELECT score, closeness, trust, romance, turns FROM relationships WHERE user_id=? AND creator_id=?', user.id, creator);
  const npcDefRow = await one(env, 'SELECT definition_json FROM npc_definitions WHERE creator_id=?', creator);
  let npcDef = null;
  if(npcDefRow?.definition_json){try{npcDef=JSON.parse(npcDefRow.definition_json);}catch(e){}}

  const episodes=await all(env,`SELECT e.*,s.current_node_id,s.revision_id FROM episodes e LEFT JOIN chat_states s ON s.episode_id=e.id AND s.user_id=? WHERE e.creator_id=? AND EXISTS(SELECT 1 FROM revisions r WHERE r.episode_id=e.id AND r.status='published') ORDER BY e.position,e.id`,user.id,creator);
  const score = relRow?.score || 0;

  if(!episodes || episodes.length === 0){
    const dummyNode = { id: 'start', text: 'สวัสดีค่ะ! คุยสดกับ AI ได้เลยนะคะ 💕', choices: [], end: true };
    return json({
      chat: {
        episodeId: 'free_ai_chat',
        revisionId: 'rev_ai',
        currentNodeId: 'start',
        nodes: [dummyNode],
        history: [],
        episodes: [],
        aiMessages: allAiMessages,
        memories: memList,
        closeness: relRow?.closeness || 0,
        trust: relRow?.trust || 0,
        romance: relRow?.romance || 0,
        score,
        definition: npcDef
      }
    });
  }"""

assert target in content, "target not found"
new_content = content.replace(target, replacement, 1)

old_return = """  return json({chat:{episodeId:episode.id,revisionId:rev.id,currentNodeId:node.id,nodes:[node],history,episodes:episodeList,aiMessages:allAiMessages,memories:memList}});"""
new_return = """  return json({chat:{episodeId:episode.id,revisionId:rev.id,currentNodeId:node.id,nodes:[node],history,episodes:episodeList,aiMessages:allAiMessages,memories:memList,closeness:relRow?.closeness||0,trust:relRow?.trust||0,romance:relRow?.romance||0,score,definition:npcDef}});"""

assert old_return in new_content, "old_return not found"
new_content = new_content.replace(old_return, new_return, 1)

with open('apps/froststory/worker/src/index.mjs', 'w') as f:
    f.write(new_content)

print("GET /api/chats/:creator enhanced successfully!")
