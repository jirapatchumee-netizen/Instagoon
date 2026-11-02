-- Migration: 0007_daily_free_energy_10.sql
-- ADR 0012: Upgrade daily free energy refill from 3 to 10 tokens

-- Update any existing energy records with less than 10 free tokens
UPDATE energy SET free = 10 WHERE free < 10 AND (next_refill_at IS NULL OR next_refill_at <= (strftime('%s','now') * 1000));

-- Recreate trigger comment_before with 10 free energy baseline
DROP TRIGGER IF EXISTS comment_before;
CREATE TRIGGER comment_before BEFORE INSERT ON comments BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM posts p LEFT JOIN relationships r ON r.creator_id=p.creator_id AND r.user_id=NEW.user_id WHERE p.id=NEW.post_id AND p.status='published' AND p.published_at<=NEW.created_at AND COALESCE(r.score,0)>=p.relationship_required) THEN RAISE(ABORT,'post_unavailable') END;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM comment_requests WHERE user_id=NEW.user_id AND request_id=NEW.request_id) THEN RAISE(ABORT,'idempotency_conflict') END;
  DELETE FROM comment_rate_events WHERE user_id=NEW.user_id AND created_at<=NEW.created_at-60000;
  SELECT CASE WHEN (SELECT COUNT(*) FROM comment_rate_events WHERE user_id=NEW.user_id AND created_at>NEW.created_at-60000)>=10 THEN RAISE(ABORT,'rate_limit') END;
  INSERT OR IGNORE INTO energy(user_id, free) VALUES(NEW.user_id, 10);
  UPDATE energy SET free=10,next_refill_at=NULL WHERE user_id=NEW.user_id AND next_refill_at IS NOT NULL AND next_refill_at<=NEW.created_at;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM comment_claims WHERE user_id=NEW.user_id AND post_id=NEW.post_id) AND (SELECT free+purchased FROM energy WHERE user_id=NEW.user_id)<1 THEN RAISE(ABORT,'energy_empty') END;
END;
