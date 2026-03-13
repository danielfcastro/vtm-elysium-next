-- Migration: Add trigger to delete character history when archived
-- When a character's status_id is set to 6 (ARCHIVED), delete all their history

-- Drop function if exists
DROP FUNCTION IF EXISTS delete_history_on_archive();

-- Create function to delete history when character is archived
CREATE OR REPLACE FUNCTION delete_history_on_archive()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status_id changes to 6 (ARCHIVED)
  IF NEW.status_id = 6 AND OLD.status_id != 6 THEN
    DELETE FROM public.characters_history WHERE character_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_delete_history_on_archive ON public.characters;

-- Create trigger
CREATE TRIGGER trg_delete_history_on_archive
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION delete_history_on_archive();

-- Add comment
COMMENT ON FUNCTION delete_history_on_archive() IS 'Deletes character history when character is archived (status_id = 6)';
