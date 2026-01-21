-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tournaments table
CREATE TABLE tournaments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_teams INTEGER NOT NULL DEFAULT 16,
  current_teams INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  prize_pool INTEGER NOT NULL DEFAULT 0,
  entry_fee INTEGER NOT NULL DEFAULT 299,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  captain_name VARCHAR(255) NOT NULL,
  captain_email VARCHAR(255) NOT NULL,
  captain_phone VARCHAR(50),
  discord_username VARCHAR(100),
  expected_players INTEGER NOT NULL DEFAULT 11,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  generated_password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  psn_id VARCHAR(255),
  ea_id VARCHAR(255),
  position VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NOK',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_method VARCHAR(50) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
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

-- Admin users table
CREATE TABLE admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_teams_tournament_id ON teams(tournament_id);
CREATE INDEX idx_teams_captain_email ON teams(captain_email);
CREATE UNIQUE INDEX idx_teams_tournament_team_name ON teams(tournament_id, lower(team_name));
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_payments_team_id ON payments(team_id);
CREATE INDEX idx_payments_stripe_id ON payments(stripe_payment_intent_id);
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment tournament teams count
CREATE OR REPLACE FUNCTION increment_tournament_teams(tournament_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE tournaments 
  SET current_teams = current_teams + 1 
  WHERE id = tournament_uuid;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
CREATE POLICY "Public read access to tournaments" ON tournaments
  FOR SELECT USING (true);

CREATE POLICY "Public can insert tournaments" ON tournaments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update tournaments" ON tournaments
  FOR UPDATE USING (true);

CREATE POLICY "Public can delete tournaments" ON tournaments
  FOR DELETE USING (true);

-- RLS Policies for teams
CREATE POLICY "Public can insert teams" ON teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read teams" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Teams can update own data" ON teams
  FOR UPDATE USING (true);

-- RLS Policies for players
CREATE POLICY "Public can insert players" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read players" ON players
  FOR SELECT USING (true);

-- RLS Policies for payments
CREATE POLICY "Public can insert payments" ON payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read payments" ON payments
  FOR SELECT USING (true);

CREATE POLICY "Public can update payments" ON payments
  FOR UPDATE USING (true);

-- RLS Policies for matches
CREATE POLICY "Public can insert matches" ON matches
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read matches" ON matches
  FOR SELECT USING (true);

CREATE POLICY "Public can update matches" ON matches
  FOR UPDATE USING (true);

-- RLS Policies for admin_users (restrictive - only service role should access)
CREATE POLICY "No public access to admin users" ON admin_users
  FOR ALL USING (false);

-- No sample data - tournaments will be created by admin through the admin panel 