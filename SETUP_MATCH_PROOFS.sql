-- Full setup for match photo proof (bildebevis)
-- Run once in Supabase → SQL Editor

-- 1) Result submission fields (if missing)
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS team1_submitted_score1 INTEGER,
ADD COLUMN IF NOT EXISTS team1_submitted_score2 INTEGER,
ADD COLUMN IF NOT EXISTS team2_submitted_score1 INTEGER,
ADD COLUMN IF NOT EXISTS team2_submitted_score2 INTEGER,
ADD COLUMN IF NOT EXISTS team1_proof_url TEXT,
ADD COLUMN IF NOT EXISTS team2_proof_url TEXT;

-- 2) Public storage bucket for proof images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'match-proofs',
  'match-proofs',
  true,
  4194304,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3) Public read access (view proof links in admin/captain UI)
DROP POLICY IF EXISTS "Public read match proofs" ON storage.objects;
CREATE POLICY "Public read match proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'match-proofs');
