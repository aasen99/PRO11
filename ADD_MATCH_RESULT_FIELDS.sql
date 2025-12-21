-- Add fields to store both teams' submitted results
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS team1_submitted_score1 INTEGER,
ADD COLUMN IF NOT EXISTS team1_submitted_score2 INTEGER,
ADD COLUMN IF NOT EXISTS team2_submitted_score1 INTEGER,
ADD COLUMN IF NOT EXISTS team2_submitted_score2 INTEGER;

-- Keep existing submitted_by, submitted_score1, submitted_score2 for backward compatibility
-- But we'll use the new team-specific fields going forward

