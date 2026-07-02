-- SECURITY FIX: Block direct writes via the public Supabase anon key.
-- Anyone could PATCH /rest/v1/matches with the browser-exposed anon key before this fix.
-- All writes must go through Next.js API routes (service role).
-- Run this in Supabase SQL Editor.

-- === MATCHES (critical) ===
DROP POLICY IF EXISTS "Public can insert matches" ON matches;
DROP POLICY IF EXISTS "Public can update matches" ON matches;
DROP POLICY IF EXISTS "Public can delete matches" ON matches;
DROP POLICY IF EXISTS "Public read access to matches" ON matches;
DROP POLICY IF EXISTS "Public can read matches" ON matches;
DROP POLICY IF EXISTS "Admin can insert matches" ON matches;
DROP POLICY IF EXISTS "Admin can update matches" ON matches;
DROP POLICY IF EXISTS "Admin can delete matches" ON matches;

CREATE POLICY "Public can read matches" ON matches
  FOR SELECT USING (true);

-- === TOURNAMENTS ===
DROP POLICY IF EXISTS "Public can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Public can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Public can delete tournaments" ON tournaments;

-- Keep: "Public read access to tournaments" (SELECT)

-- === TEAMS ===
DROP POLICY IF EXISTS "Public can insert teams" ON teams;
DROP POLICY IF EXISTS "Teams can update own data" ON teams;

-- Keep: "Public can read teams" (SELECT) for public listings

-- === PLAYERS ===
DROP POLICY IF EXISTS "Public can insert players" ON players;

-- Keep: "Public can read players" (SELECT)

-- === PAYMENTS ===
DROP POLICY IF EXISTS "Public can insert payments" ON payments;
DROP POLICY IF EXISTS "Public can update payments" ON payments;
DROP POLICY IF EXISTS "Public can read payments" ON payments;

-- === CAPTAIN MESSAGES ===
DROP POLICY IF EXISTS "Public can insert captain messages" ON captain_messages;
DROP POLICY IF EXISTS "Public can read captain messages" ON captain_messages;
