-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tournaments table
CREATE TABLE tournaments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  description_en TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_teams INTEGER NOT NULL DEFAULT 16,
  current_teams INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled', 'archived')),
  check_in_open BOOLEAN NOT NULL DEFAULT false,
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
  checked_in BOOLEAN NOT NULL DEFAULT false,
  expected_players INTEGER NOT NULL DEFAULT 11,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  prize_payout_type VARCHAR(20) CHECK (prize_payout_type IN ('norwegian', 'international')),
  prize_bank_account VARCHAR(20),
  prize_iban VARCHAR(34),
  prize_swift_bic VARCHAR(11),
  prize_account_holder VARCHAR(255),
  prize_payout_submitted_at TIMESTAMP WITH TIME ZONE,
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
  payment_provider VARCHAR(20),
  provider_order_id VARCHAR(255),
  provider_transaction_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  gross_amount INTEGER,
  fee_amount INTEGER,
  net_amount INTEGER,
  paid_at TIMESTAMP WITH TIME ZONE,
  fee_source VARCHAR(30),
  payout_id VARCHAR(255),
  payout_date TIMESTAMP WITH TIME ZONE,
  reconciled BOOLEAN NOT NULL DEFAULT false,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  accounting_note TEXT,
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
  group_round INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'pending_result', 'pending_confirmation')),
  score1 INTEGER,
  score2 INTEGER,
  submitted_by VARCHAR(255),
  submitted_score1 INTEGER,
  submitted_score2 INTEGER,
  team1_submitted_score1 INTEGER,
  team1_submitted_score2 INTEGER,
  team2_submitted_score1 INTEGER,
  team2_submitted_score2 INTEGER,
  team1_proof_url TEXT,
  team2_proof_url TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match result log (audit trail for result changes)
CREATE TABLE match_result_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR(50) NOT NULL,
  actor_type VARCHAR(50),
  actor_name VARCHAR(255),
  old_score1 INTEGER,
  old_score2 INTEGER,
  new_score1 INTEGER,
  new_score2 INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_match_result_log_match_id ON match_result_log(match_id);

-- Live center activity log
CREATE TABLE tournament_events (
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
CREATE INDEX idx_tournament_events_tournament_id ON tournament_events(tournament_id);
CREATE INDEX idx_tournament_events_created_at ON tournament_events(created_at DESC);

-- Captain messages table (messages from captains to admin)
CREATE TABLE captain_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_name VARCHAR(255) NOT NULL,
  captain_name VARCHAR(255) NOT NULL,
  captain_email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX idx_captain_messages_tournament_id ON captain_messages(tournament_id);
CREATE INDEX idx_captain_messages_status ON captain_messages(status);

-- Team streams (player-submitted links per team)
CREATE TABLE team_streams (
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
CREATE INDEX idx_team_streams_tournament_id ON team_streams(tournament_id);
CREATE INDEX idx_team_streams_team_id ON team_streams(tournament_id, team_id);
CREATE UNIQUE INDEX idx_team_streams_tournament_normalized_url ON team_streams(tournament_id, normalized_url);

-- Anonymous team follows (follower counts)
CREATE TABLE tournament_team_followers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  visitor_id VARCHAR(64) NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tournament_id, visitor_id)
);
CREATE INDEX idx_tournament_team_followers_team ON tournament_team_followers(tournament_id, team_name);

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
ALTER TABLE captain_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_team_followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
CREATE POLICY "Public read access to tournaments" ON tournaments
  FOR SELECT USING (true);

-- RLS Policies for teams
CREATE POLICY "Public can read teams" ON teams
  FOR SELECT USING (true);

-- RLS Policies for players
CREATE POLICY "Public can read players" ON players
  FOR SELECT USING (true);

-- RLS Policies for matches
CREATE POLICY "Public can read matches" ON matches
  FOR SELECT USING (true);

-- RLS Policies for captain_messages
-- No public access; API uses service role

-- tournament_events: RLS enabled, no anon/authenticated policies (service role only)

-- RLS Policies for team_streams
CREATE POLICY "Public can read team streams" ON team_streams
  FOR SELECT USING (true);

CREATE POLICY "Public can read tournament team followers" ON tournament_team_followers
  FOR SELECT USING (true);

-- RLS Policies for admin_users (restrictive - only service role should access)
CREATE POLICY "No public access to admin users" ON admin_users
  FOR ALL USING (false);

-- No sample data - tournaments will be created by admin through the admin panel 