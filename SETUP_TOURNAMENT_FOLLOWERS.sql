-- Anonymous team follows per tournament (for follower counts / competition).
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS tournament_team_followers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  visitor_id VARCHAR(64) NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tournament_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_team_followers_team
  ON tournament_team_followers(tournament_id, team_name);

ALTER TABLE tournament_team_followers ENABLE ROW LEVEL SECURITY;

-- Public read for counts; writes go through Next.js API (service role).
DROP POLICY IF EXISTS "Public can read tournament team followers" ON tournament_team_followers;
CREATE POLICY "Public can read tournament team followers" ON tournament_team_followers
  FOR SELECT USING (true);
