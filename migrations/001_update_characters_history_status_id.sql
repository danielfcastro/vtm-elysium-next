-- Migration: Update characters_history to use status_id instead of status
-- Run this script to fix the trigger that references the old "status" column

-- 1. Add status_id column to characters_history (if not exists)
ALTER TABLE public.characters_history 
ADD COLUMN IF NOT EXISTS status_id smallint;

-- 2. Drop the old trigger and function if they exist
DROP TRIGGER IF EXISTS characters_history_before_update ON public.characters;
DROP FUNCTION IF EXISTS characters_history_before_update();

-- 3. Create the updated trigger function that uses status_id
CREATE OR REPLACE FUNCTION characters_history_before_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.characters_history (
    character_id,
    game_id,
    owner_user_id,
    status_id,
    submitted_at,
    approved_at,
    approved_by_user_id,
    rejected_at,
    rejected_by_user_id,
    rejection_reason,
    sheet,
    total_experience,
    spent_experience,
    version,
    created_at,
    updated_at,
    deleted_at
  )
  VALUES (
    OLD.id,
    OLD.game_id,
    OLD.owner_user_id,
    OLD.status_id,
    OLD.submitted_at,
    OLD.approved_at,
    OLD.approved_by_user_id,
    OLD.rejected_at,
    OLD.rejected_by_user_id,
    OLD.rejection_reason,
    OLD.sheet,
    OLD.total_experience,
    OLD.spent_experience,
    OLD.version,
    OLD.created_at,
    OLD.updated_at,
    OLD.deleted_at
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate the trigger
CREATE TRIGGER characters_history_before_update
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION characters_history_before_update();

-- 5. Optionally: copy existing status values to status_id (for historical data)
-- Only run this if you have existing history records that need to be backfilled
-- UPDATE characters_history ch
-- SET status_id = cs.status_id
-- FROM characters cs
-- WHERE ch.character_id = cs.id
-- AND ch.status_id IS NULL;

-- 6. Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'characters_history now has status_id column and trigger uses it instead of status';
END $$;
