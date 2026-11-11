-- Speed up content synchronization and avoid full table scans on creator updates/suspensions
CREATE INDEX IF NOT EXISTS idx_revisions_creator_status ON revisions(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_creator_status ON posts(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_stories_creator_status ON stories(creator_id, status);
