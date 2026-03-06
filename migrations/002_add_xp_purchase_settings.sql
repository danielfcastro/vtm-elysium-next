-- Migration: Add XP purchase settings to games table
-- Allows Storytellers to enable/disable XP purchases of Backgrounds, Merits, and Flaws per chronicle

-- 1. Add columns for XP purchase settings (default to true for backwards compatibility)
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS allow_background_xp_purchase boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_merit_flaws_xp_purchase boolean DEFAULT false;

-- 2. Update the GET route to include the new fields
-- (This will be handled in the API code)

-- 3. Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'games table now has allow_background_xp_purchase and allow_merit_flaws_xp_purchase columns';
END $$;
