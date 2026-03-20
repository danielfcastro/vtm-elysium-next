-- Migration: Add roles table and refactor user_game_roles
-- Created: 2026-03-18

-- Create roles table
CREATE TABLE public.roles (
    id smallint NOT NULL,
    name varchar NOT NULL,
    CONSTRAINT roles_pk PRIMARY KEY (id),
    CONSTRAINT roles_unique UNIQUE (name)
);

-- Insert role data
INSERT INTO public.roles (id, name) VALUES (1, 'PLAYER');
INSERT INTO public.roles (id, name) VALUES (2, 'STORYTELLER');

-- Add role_id column to user_game_roles
ALTER TABLE public.user_game_roles ADD COLUMN role_id smallint;

-- Copy existing role values to role_id
UPDATE public.user_game_roles SET role_id = CASE 
    WHEN role = 'PLAYER' THEN 1
    WHEN role = 'STORYTELLER' THEN 2
END;

-- Add foreign key constraint
ALTER TABLE public.user_game_roles ADD CONSTRAINT user_game_roles_roles_fk 
    FOREIGN KEY (role_id) REFERENCES public.roles(id);

-- Drop the old role column and type
ALTER TABLE public.user_game_roles DROP COLUMN role;
ALTER TABLE public.user_game_roles DROP CONSTRAINT user_game_roles_pkey;
ALTER TABLE public.user_game_roles ADD CONSTRAINT user_game_roles_pkey PRIMARY KEY (user_id, game_id);

-- Drop the old enum type (after dropping the column)
DROP TYPE IF EXISTS public.game_role;

-- Note: The type xp_spend_status is still used by xp_spend_logs table
-- If you want to refactor it too, similar changes would be needed
