-- Match result photo proof (bildebevis)
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS team1_proof_url TEXT,
ADD COLUMN IF NOT EXISTS team2_proof_url TEXT;

-- Supabase Storage: create a public bucket named "match-proofs"
-- Dashboard: Storage → New bucket → name: match-proofs → Public bucket: ON
-- Or run (if storage schema is available):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('match-proofs', 'match-proofs', true)
-- ON CONFLICT (id) DO NOTHING;
