-- Fix tournament_events RLS if you already ran an older SETUP script with public read.
-- Run in Supabase SQL Editor.

ALTER TABLE tournament_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tournament events" ON tournament_events;

REVOKE ALL ON TABLE tournament_events FROM anon, authenticated;
