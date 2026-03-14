-- Drop the unique constraint that prevents multiple characters per user per game
ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS uq_characters_game_owner_active;
