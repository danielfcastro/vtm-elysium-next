--
-- PostgreSQL database dump
--

-- Started on 2026-03-14 00:53:05 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Set search path
SET search_path TO public;

-- Create citext extension first
CREATE EXTENSION IF NOT EXISTS citext;

-- Create pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

--
-- TYPE: game_role
--
CREATE TYPE public.game_role AS ENUM (
    'STORYTELLER',
    'PLAYER'
);

--
-- TYPE: xp_spend_status
--
CREATE TYPE public.xp_spend_status AS ENUM (
    'REJECTED',
    'APPROVED',
    'PENDING'
);

--
-- FUNCTION: characters_history_before_update()
--
CREATE FUNCTION public.characters_history_before_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;

--
-- FUNCTION: delete_history_on_archive()
--
CREATE FUNCTION public.delete_history_on_archive() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status_id = 6 AND OLD.status_id != 6 THEN
    DELETE FROM public.characters_history WHERE character_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

--
-- FUNCTION: set_updated_at_and_version()
--
CREATE FUNCTION public.set_updated_at_and_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

--
-- TABLE: audit_log_types
--
CREATE TABLE public.audit_log_types (
    id smallint NOT NULL,
    type text NOT NULL,
    description text NOT NULL
);

--
-- TABLE: audit_logs
--
CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    character_id uuid,
    user_id uuid,
    action_type_id smallint NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- TABLE: character_status
--
CREATE TABLE public.character_status (
    id smallint NOT NULL,
    type text NOT NULL,
    description text
);

--
-- TABLE: users
--
CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email public.citext NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- TABLE: games
--
CREATE TABLE public.games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    storyteller_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Seed data: Games
INSERT INTO public.games VALUES ('67bd0fcf-7f5e-471c-a17a-aa006cf3bcdf', 'Os Três Silêncios', 'Crônica Dark Ages V20', '6bef6a75-c268-4339-aaec-6f317d94ed2b', '2025-12-30 11:04:56.408+00', '2025-12-30 11:04:56.408+00');

--
-- TABLE: user_game_roles
--
CREATE TABLE public.user_game_roles (
    user_id uuid NOT NULL,
    game_id uuid NOT NULL,
    role public.game_role NOT NULL
);

-- Seed data: User Game Roles
INSERT INTO public.user_game_roles VALUES ('6bef6a75-c268-4339-aaec-6f317d94ed2b', '67bd0fcf-7f5e-471c-a17a-aa006cf3bcdf', 'STORYTELLER');
INSERT INTO public.user_game_roles VALUES ('b2008811-58b0-4194-82a5-9de23cf02f0d', '67bd0fcf-7f5e-471c-a17a-aa006cf3bcdf', 'PLAYER');


-- Seed data: Users
INSERT INTO public.users VALUES ('6bef6a75-c268-4339-aaec-6f317d94ed2b', 'st@elysium.test', '$2b$10$WOO0IcMKrJlbX1N8YKXbO.YgvWdD16ZupyNVRzJDDNwgKOBmW9VBW', 'Storyteller', true, '2025-12-30 10:58:41.406+00', '2025-12-30 23:23:02.542+00');

--
-- TABLE: characters
--
CREATE TABLE public.characters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    owner_user_id uuid NOT NULL,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    approved_by_user_id uuid,
    rejected_at timestamp with time zone,
    rejected_by_user_id uuid,
    rejection_reason text,
    sheet jsonb DEFAULT '{}'::jsonb NOT NULL,
    total_experience integer DEFAULT 0 NOT NULL,
    spent_experience integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    status_id smallint,
    CONSTRAINT chk_characters_xp_nonnegative CHECK (((total_experience >= 0) AND (spent_experience >= 0))),
    CONSTRAINT chk_characters_xp_spent_le_total CHECK ((spent_experience <= total_experience))
);

--
-- TABLE: characters_history
--
CREATE TABLE public.characters_history (
    history_id uuid DEFAULT gen_random_uuid() NOT NULL,
    character_id uuid NOT NULL,
    game_id uuid NOT NULL,
    owner_user_id uuid NOT NULL,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    approved_by_user_id uuid,
    rejected_at timestamp with time zone,
    rejected_by_user_id uuid,
    rejection_reason text,
    sheet jsonb NOT NULL,
    total_experience integer NOT NULL,
    spent_experience integer NOT NULL,
    version integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    history_created_at timestamp with time zone DEFAULT now() NOT NULL,
    status_id smallint
);

--
-- TABLE: xp_grants
--
CREATE TABLE public.xp_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    character_id uuid NOT NULL,
    granted_by_id uuid NOT NULL,
    amount integer NOT NULL,
    session_date date NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_xp_grants_amount_positive CHECK ((amount > 0))
);

--
-- TABLE: xp_spend_logs
--
CREATE TABLE public.xp_spend_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    character_id uuid NOT NULL,
    requested_by_id uuid NOT NULL,
    resolved_by_id uuid,
    status public.xp_spend_status DEFAULT 'PENDING'::public.xp_spend_status NOT NULL,
    xp_cost integer NOT NULL,
    payload jsonb NOT NULL,
    reason_rejected text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT chk_xp_spend_cost_positive CHECK ((xp_cost > 0))
);

-- Seed data
INSERT INTO public.audit_log_types VALUES (1, 'STARTING_POINTS', 'Starting Points');
INSERT INTO public.audit_log_types VALUES (2, 'FREEBIE_POINTS', 'Freebie Points');
INSERT INTO public.audit_log_types VALUES (4, 'SPECIALTY', 'Specialty Selected');
INSERT INTO public.audit_log_types VALUES (5, 'MERITS_FLAWS', 'Merits and Flaws');
INSERT INTO public.audit_log_types VALUES (3, 'XP_SPENT', 'XP Points');
INSERT INTO public.audit_log_types VALUES (6, 'XP_GRANT', 'Storyteller grants XP');

INSERT INTO public.character_status VALUES (1, 'DRAFT_PHASE1', 'Initial draft – phase 1');
INSERT INTO public.character_status VALUES (2, 'DRAFT_PHASE2', 'Initial draft – phase 2');
INSERT INTO public.character_status VALUES (3, 'SUBMITTED', 'Submitted for review/approval');
INSERT INTO public.character_status VALUES (4, 'APPROVED', 'Approved by game master / staff');
INSERT INTO public.character_status VALUES (5, 'REJECTED', 'Rejected during review');
INSERT INTO public.character_status VALUES (6, 'ARCHIVED', 'Archived (old, completed or inactive)');
INSERT INTO public.character_status VALUES (7, 'XP', 'Active character entitled to receive XP');


-- Constraints (applied after seed data)
ALTER TABLE ONLY public.audit_log_types ADD CONSTRAINT audit_log_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.audit_log_types ADD CONSTRAINT audit_log_types_type_key UNIQUE (type);
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.character_status ADD CONSTRAINT character_status_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.character_status ADD CONSTRAINT character_status_type_key UNIQUE (type);
ALTER TABLE ONLY public.characters ADD CONSTRAINT characters_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.characters_history ADD CONSTRAINT characters_history_pkey PRIMARY KEY (history_id);
ALTER TABLE ONLY public.games ADD CONSTRAINT games_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_game_roles ADD CONSTRAINT user_game_roles_pkey PRIMARY KEY (user_id, game_id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.xp_grants ADD CONSTRAINT xp_grants_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.xp_spend_logs ADD CONSTRAINT xp_spend_logs_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_audit_logs_action_type_id ON public.audit_logs USING btree (action_type_id);
CREATE INDEX idx_audit_logs_character_id ON public.audit_logs USING btree (character_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);
CREATE UNIQUE INDEX idx_character_status_type ON public.character_status USING btree (type);
CREATE INDEX idx_characters_game_id ON public.characters USING btree (game_id);
CREATE INDEX idx_characters_history_character_id ON public.characters_history USING btree (character_id);
CREATE INDEX idx_characters_history_created_at ON public.characters_history USING btree (history_created_at);
CREATE INDEX idx_characters_owner_user_id ON public.characters USING btree (owner_user_id);
CREATE INDEX idx_characters_status_id ON public.characters USING btree (status_id);
CREATE INDEX idx_user_game_roles_game_id ON public.user_game_roles USING btree (game_id);
CREATE INDEX idx_user_game_roles_user_id ON public.user_game_roles USING btree (user_id);
CREATE INDEX idx_xp_grants_character_id ON public.xp_grants USING btree (character_id);
CREATE INDEX idx_xp_spend_logs_character_id ON public.xp_spend_logs USING btree (character_id);
CREATE INDEX idx_xp_spend_logs_status ON public.xp_spend_logs USING btree (status);

-- Triggers
CREATE TRIGGER characters_history_before_update BEFORE UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION public.characters_history_before_update();
CREATE TRIGGER trg_characters_history_before_update BEFORE UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION public.characters_history_before_update();
CREATE TRIGGER trg_characters_set_updated_at_and_version BEFORE UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();
CREATE TRIGGER trg_delete_history_on_archive BEFORE UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION public.delete_history_on_archive();

-- Foreign Keys
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_action_type_id_fkey FOREIGN KEY (action_type_id) REFERENCES public.audit_log_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.characters ADD CONSTRAINT characters_approved_by_user_id_fkey FOREIGN KEY (approved_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.characters ADD CONSTRAINT characters_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.characters ADD CONSTRAINT characters_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.characters ADD CONSTRAINT characters_rejected_by_user_id_fkey FOREIGN KEY (rejected_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.characters ADD CONSTRAINT characters_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.character_status(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.characters_history ADD CONSTRAINT characters_history_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.games ADD CONSTRAINT games_storyteller_id_fkey FOREIGN KEY (storyteller_id) REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_game_roles ADD CONSTRAINT user_game_roles_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_game_roles ADD CONSTRAINT user_game_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.xp_grants ADD CONSTRAINT xp_grants_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.xp_grants ADD CONSTRAINT xp_grants_granted_by_id_fkey FOREIGN KEY (granted_by_id) REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.xp_spend_logs ADD CONSTRAINT xp_spend_logs_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.xp_spend_logs ADD CONSTRAINT xp_spend_logs_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.xp_spend_logs ADD CONSTRAINT xp_spend_logs_resolved_by_id_fkey FOREIGN KEY (resolved_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- PostgreSQL database dump complete
