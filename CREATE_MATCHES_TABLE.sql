-- Create matches table if it doesn't exist
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  team1_name VARCHAR(255) NOT NULL,
  team2_name VARCHAR(255) NOT NULL,
  round VARCHAR(100) NOT NULL,
  group_name VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'pending_result', 'pending_confirmation')),
  score1 INTEGER,
  score2 INTEGER,
  submitted_by VARCHAR(255),
  submitted_score1 INTEGER,
  submitted_score2 INTEGER,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public read access to matches" ON matches;
DROP POLICY IF EXISTS "Public can insert matches" ON matches;
DROP POLICY IF EXISTS "Public can update matches" ON matches;
DROP POLICY IF EXISTS "Public can delete matches" ON matches;
DROP POLICY IF EXISTS "Admin can insert matches" ON matches;
DROP POLICY IF EXISTS "Admin can update matches" ON matches;
DROP POLICY IF EXISTS "Admin can delete matches" ON matches;

-- Create RLS Policies
CREATE POLICY "Public read access to matches" ON matches
  FOR SELECT USING (true);

CREATE POLICY "Public can insert matches" ON matches
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update matches" ON matches
  FOR UPDATE USING (true);

CREATE POLICY "Public can delete matches" ON matches
  FOR DELETE USING (true);

-- Create trigger for updated_at if function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
    CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

