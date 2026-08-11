-- Team streams: players submit one stream link per team (max 10 per team).
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS team_streams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  service VARCHAR(20) NOT NULL CHECK (service IN ('twitch', 'youtube', 'kick')),
  stream_url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  display_name VARCHAR(100),
  delete_token_hash VARCHAR(128) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_streams_tournament_id ON team_streams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_team_streams_team_id ON team_streams(tournament_id, team_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_streams_tournament_normalized_url
  ON team_streams(tournament_id, normalized_url);

ALTER TABLE team_streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read team streams" ON team_streams;
CREATE POLICY "Public can read team streams" ON team_streams
  FOR SELECT USING (true);

-- Writes go through Next.js API (service role) only.
