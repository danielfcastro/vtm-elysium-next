-- Migration: Refactor xp_spend_logs to use status_id FK instead of xp_spend_status ENUM
-- Created: 2026-03-18
--
-- Summary:
--   1. Create xp_spent_status lookup table  (1=APPROVED, 2=REJECTED, 3=PENDING)
--   2. Add status_id column (int2) to xp_spend_logs and populate from old status ENUM
--   3. Add FK constraint + drop old index on status
--   4. Drop the old status column and xp_spend_status / _xp_spend_status ENUM types

-- ────────────────────────────────────────────────────────────
-- 1. Create lookup table
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.xp_spent_status (
    id   int2        NOT NULL,
    type varchar     NOT NULL,
    CONSTRAINT xp_spent_status_pk     PRIMARY KEY (id),
    CONSTRAINT xp_spent_status_unique UNIQUE (type)
);

ALTER TABLE public.xp_spent_status OWNER TO vtm_app;
GRANT ALL ON TABLE public.xp_spent_status TO vtm_app;

INSERT INTO public.xp_spent_status (id, type) VALUES (1, 'APPROVED');
INSERT INTO public.xp_spent_status (id, type) VALUES (2, 'REJECTED');
INSERT INTO public.xp_spent_status (id, type) VALUES (3, 'PENDING');

-- ────────────────────────────────────────────────────────────
-- 2. Add status_id column and back-fill from ENUM values
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.xp_spend_logs ADD COLUMN status_id int2;

UPDATE public.xp_spend_logs
SET status_id = CASE status::text
    WHEN 'APPROVED' THEN 1
    WHEN 'REJECTED' THEN 2
    WHEN 'PENDING'  THEN 3
END;

-- Make NOT NULL now that every row has been populated
ALTER TABLE public.xp_spend_logs ALTER COLUMN status_id SET NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 3. Add FK, recreate index on status_id
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.xp_spend_logs
    ADD CONSTRAINT xp_spend_logs_xp_spent_status_fk
    FOREIGN KEY (status_id) REFERENCES public.xp_spent_status(id);

-- Replace old index that targeted the ENUM column
DROP INDEX IF EXISTS public.idx_xp_spend_logs_status;
CREATE INDEX idx_xp_spend_logs_status_id ON public.xp_spend_logs USING btree (status_id);

-- ────────────────────────────────────────────────────────────
-- 4. Drop the old status column and the ENUM types
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.xp_spend_logs DROP COLUMN status;

-- Drop ENUM types (array type first because it depends on the base type)
DROP TYPE IF EXISTS public._xp_spend_status;
DROP TYPE IF EXISTS public.xp_spend_status;
