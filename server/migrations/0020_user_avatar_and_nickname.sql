-- Add avatar_id and nickname to users for personalized roleplay profile
ALTER TABLE users ADD COLUMN avatar_id TEXT;
ALTER TABLE users ADD COLUMN nickname TEXT;
