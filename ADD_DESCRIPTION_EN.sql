-- Add English description column for tournament translations.
-- Run in Supabase SQL Editor if you use the translate feature in admin.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS description_en TEXT;
