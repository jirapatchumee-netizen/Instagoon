-- Additive: existing relationships and chat history are preserved. Costs are pinned on the first successful turn.
CREATE TABLE chat_credit_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  credits_spent INTEGER NOT NULL DEFAULT 0 CHECK(credits_spent >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK(level BETWEEN 1 AND 5),
  costs_json TEXT NOT NULL,
  config_version TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id,creator_id)
);
-- A retry of the same successful request returns its reply without spending energy or advancing again.
CREATE TABLE chat_credit_receipts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  reply_id TEXT NOT NULL UNIQUE,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id,creator_id,request_id)
);

-- Preserve the achieved level of existing Studio players when their creator enables credit progression.
INSERT INTO chat_credit_progress(user_id,creator_id,credits_spent,level,costs_json,config_version,updated_at)
SELECT r.user_id,r.creator_id,0,MIN(5,MAX(1,1+CAST(r.score/20 AS INTEGER))),
  '[100,200,300,400]','credits-v1:100,200,300,400',s.updated_at
FROM relationships r JOIN studio_creators s ON s.creator_id=r.creator_id;

-- Legacy comment/story/episode effects cannot buy credit levels. The score remains a compatibility projection.
CREATE TRIGGER credit_level_score_insert AFTER INSERT ON relationships
WHEN substr(NEW.creator_id,1,5)<>'cosp_' AND EXISTS (
  SELECT 1 FROM npc_definitions WHERE creator_id=NEW.creator_id
  AND json_extract(definition_json,'$.relationship.creditProgression.mode')='credits'
) BEGIN
  UPDATE relationships SET score=COALESCE((SELECT (level-1)*20 FROM chat_credit_progress
    WHERE user_id=NEW.user_id AND creator_id=NEW.creator_id),0)
  WHERE user_id=NEW.user_id AND creator_id=NEW.creator_id;
END;
CREATE TRIGGER credit_level_score_update AFTER UPDATE OF score ON relationships
WHEN substr(NEW.creator_id,1,5)<>'cosp_' AND EXISTS (
  SELECT 1 FROM npc_definitions WHERE creator_id=NEW.creator_id
  AND json_extract(definition_json,'$.relationship.creditProgression.mode')='credits'
) AND NEW.score<>COALESCE((SELECT (level-1)*20 FROM chat_credit_progress
    WHERE user_id=NEW.user_id AND creator_id=NEW.creator_id),0)
BEGIN
  UPDATE relationships SET score=COALESCE((SELECT (level-1)*20 FROM chat_credit_progress
    WHERE user_id=NEW.user_id AND creator_id=NEW.creator_id),0)
  WHERE user_id=NEW.user_id AND creator_id=NEW.creator_id;
END;
