-- Live center activity log (secure: RLS on, no public/anon access)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tournament_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  detail TEXT,
  actor_name VARCHAR(255),
  actor_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_events_tournament_id ON tournament_events(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_events_created_at ON tournament_events(created_at DESC);

ALTER TABLE tournament_events ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated.
-- Server-side admin API uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

REVOKE ALL ON TABLE tournament_events FROM anon, authenticated;
