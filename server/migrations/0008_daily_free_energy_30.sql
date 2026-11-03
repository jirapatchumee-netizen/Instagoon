-- Migration: 0008_daily_free_energy_30.sql
-- Upgrade daily free energy refill from 10 to 30 tokens

-- Update all existing energy records with less than 30 free tokens
UPDATE energy SET free = 30 WHERE free < 30;

-- Recreate trigger comment_before with 30 free energy baseline
DROP TRIGGER IF EXISTS comment_before;
CREATE TRIGGER comment_before
BEFORE INSERT ON comments
FOR EACH ROW
BEGIN
  INSERT OR IGNORE INTO energy(user_id, free) VALUES(NEW.user_id, 30);
  UPDATE energy SET free=30,next_refill_at=NULL WHERE user_id=NEW.user_id AND next_refill_at IS NOT NULL AND next_refill_at<=NEW.created_at;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM comment_claims WHERE user_id=NEW.user_id AND post_id=NEW.post_id) AND (SELECT free+purchased FROM energy WHERE user_id=NEW.user_id)<1 THEN RAISE(ABORT,'energy_empty') END;
END;
