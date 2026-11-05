-- Migration: 0009_lifetime_free_energy_30.sql
-- Free energy is a one-time grant of 30 per account and never refills (owner decision, 6 Nov 2026).
-- Before this, a comment started a 4-hour timer that refilled free energy to 30.
-- Admins can still add energy per player through /api/admin/energy.

UPDATE energy SET next_refill_at = NULL;

-- comment_before without the refill. It also restores the visibility, idempotency and
-- 10-per-minute checks that 0008 dropped (the API checks them too, but not atomically).
DROP TRIGGER IF EXISTS comment_before;
CREATE TRIGGER comment_before BEFORE INSERT ON comments BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM posts p LEFT JOIN relationships r ON r.creator_id=p.creator_id AND r.user_id=NEW.user_id WHERE p.id=NEW.post_id AND p.status='published' AND p.published_at<=NEW.created_at AND COALESCE(r.score,0)>=p.relationship_required) THEN RAISE(ABORT,'post_unavailable') END;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM comment_requests WHERE user_id=NEW.user_id AND request_id=NEW.request_id) THEN RAISE(ABORT,'idempotency_conflict') END;
  DELETE FROM comment_rate_events WHERE user_id=NEW.user_id AND created_at<=NEW.created_at-60000;
  SELECT CASE WHEN (SELECT COUNT(*) FROM comment_rate_events WHERE user_id=NEW.user_id AND created_at>NEW.created_at-60000)>=10 THEN RAISE(ABORT,'rate_limit') END;
  INSERT OR IGNORE INTO energy(user_id, free) VALUES(NEW.user_id, 30);
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM comment_claims WHERE user_id=NEW.user_id AND post_id=NEW.post_id) AND (SELECT free+purchased FROM energy WHERE user_id=NEW.user_id)<1 THEN RAISE(ABORT,'energy_empty') END;
END;

-- comment_after without starting the refill timer.
DROP TRIGGER IF EXISTS comment_after;
CREATE TRIGGER comment_after AFTER INSERT ON comments WHEN NOT EXISTS (SELECT 1 FROM comment_claims WHERE user_id=NEW.user_id AND post_id=NEW.post_id) BEGIN
  INSERT INTO token_ledger(id,user_id,delta_free,delta_purchased,reason,created_at) SELECT NEW.id,NEW.user_id,CASE WHEN free>0 THEN -1 ELSE 0 END,CASE WHEN free>0 THEN 0 ELSE -1 END,'comment',NEW.created_at FROM energy WHERE user_id=NEW.user_id;
  UPDATE energy SET purchased=CASE WHEN free=0 THEN purchased-1 ELSE purchased END,free=CASE WHEN free>0 THEN free-1 ELSE free END WHERE user_id=NEW.user_id;
  INSERT INTO relationships(user_id,creator_id,score) VALUES(NEW.user_id,(SELECT creator_id FROM posts WHERE id=NEW.post_id),1) ON CONFLICT(user_id,creator_id) DO UPDATE SET score=score+1;
  INSERT INTO comment_claims(user_id,post_id) VALUES(NEW.user_id,NEW.post_id);
END;
