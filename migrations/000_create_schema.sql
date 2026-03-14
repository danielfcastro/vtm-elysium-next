-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';

-- DROP TYPE public."citext";

CREATE TYPE public."citext" (
	INPUT = citextin,
	OUTPUT = citextout,
	RECEIVE = citextrecv,
	SEND = citextsend,
	ALIGNMENT = 4,
	STORAGE = any,
	CATEGORY = S,
	DELIMITER = ',',
	COLLATABLE = true);

-- DROP TYPE public."game_role";

CREATE TYPE public."game_role" AS ENUM (
	'STORYTELLER',
	'PLAYER');

-- DROP TYPE public."xp_spend_status";

CREATE TYPE public."xp_spend_status" AS ENUM (
	'REJECTED',
	'APPROVED',
	'PENDING');
-- public.audit_log_types definition

-- Drop table

-- DROP TABLE public.audit_log_types;

CREATE TABLE public.audit_log_types (
	id int2 NOT NULL,
	"type" text NOT NULL,
	description text NOT NULL,
	CONSTRAINT audit_log_types_pkey PRIMARY KEY (id),
	CONSTRAINT audit_log_types_type_key UNIQUE (type)
);


-- public.character_status definition

-- Drop table

-- DROP TABLE public.character_status;

CREATE TABLE public.character_status (
	id int2 NOT NULL,
	"type" text NOT NULL,
	description text NULL,
	CONSTRAINT character_status_pkey PRIMARY KEY (id),
	CONSTRAINT character_status_type_key UNIQUE (type)
);
CREATE UNIQUE INDEX idx_character_status_type ON public.character_status USING btree (type);
COMMENT ON TABLE public.character_status IS 'Replaces former character_status enum. Canonical list of character lifecycle states.';


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	email public."citext" NOT NULL,
	password_hash text NOT NULL,
	"name" text NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);


-- public.audit_logs definition

-- Drop table

-- DROP TABLE public.audit_logs;

CREATE TABLE public.audit_logs (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	character_id uuid NULL,
	user_id uuid NULL,
	action_type_id int2 NOT NULL,
	payload jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
	CONSTRAINT audit_logs_action_type_id_fkey FOREIGN KEY (action_type_id) REFERENCES public.audit_log_types(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX idx_audit_logs_action_type_id ON public.audit_logs USING btree (action_type_id);
CREATE INDEX idx_audit_logs_character_id ON public.audit_logs USING btree (character_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


-- public.games definition

-- Drop table

-- DROP TABLE public.games;

CREATE TABLE public.games (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	description text NULL,
	storyteller_id uuid NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT games_pkey PRIMARY KEY (id),
	CONSTRAINT games_storyteller_id_fkey FOREIGN KEY (storyteller_id) REFERENCES public.users(id) ON DELETE RESTRICT
);


-- public.user_game_roles definition

-- Drop table

-- DROP TABLE public.user_game_roles;

CREATE TABLE public.user_game_roles (
	user_id uuid NOT NULL,
	game_id uuid NOT NULL,
	"role" public."game_role" NOT NULL,
	CONSTRAINT user_game_roles_pkey PRIMARY KEY (user_id, game_id),
	CONSTRAINT user_game_roles_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE,
	CONSTRAINT user_game_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_game_roles_game_id ON public.user_game_roles USING btree (game_id);
CREATE INDEX idx_user_game_roles_user_id ON public.user_game_roles USING btree (user_id);


-- public."characters" definition

-- Drop table

-- DROP TABLE public."characters";

CREATE TABLE public."characters" (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	game_id uuid NOT NULL,
	owner_user_id uuid NOT NULL,
	submitted_at timestamptz NULL,
	approved_at timestamptz NULL,
	approved_by_user_id uuid NULL,
	rejected_at timestamptz NULL,
	rejected_by_user_id uuid NULL,
	rejection_reason text NULL,
	sheet jsonb DEFAULT '{}'::jsonb NOT NULL,
	total_experience int4 DEFAULT 0 NOT NULL,
	spent_experience int4 DEFAULT 0 NOT NULL,
	"version" int4 DEFAULT 1 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	deleted_at timestamptz NULL,
	status_id int2 NULL,
	CONSTRAINT characters_pkey PRIMARY KEY (id),
	CONSTRAINT chk_characters_xp_nonnegative CHECK (((total_experience >= 0) AND (spent_experience >= 0))),
	CONSTRAINT chk_characters_xp_spent_le_total CHECK ((spent_experience <= total_experience)),
	CONSTRAINT characters_approved_by_user_id_fkey FOREIGN KEY (approved_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL,
	CONSTRAINT characters_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE,
	CONSTRAINT characters_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
	CONSTRAINT characters_rejected_by_user_id_fkey FOREIGN KEY (rejected_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL,
	CONSTRAINT characters_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.character_status(id) ON DELETE SET NULL
);
CREATE INDEX idx_characters_game_id ON public.characters USING btree (game_id);
CREATE INDEX idx_characters_owner_user_id ON public.characters USING btree (owner_user_id);
CREATE INDEX idx_characters_status_id ON public.characters USING btree (status_id);

-- Table Triggers

create trigger trg_characters_history_before_update before
update
    on
    public.characters for each row execute function characters_history_before_update();
create trigger trg_characters_set_updated_at_and_version before
update
    on
    public.characters for each row execute function set_updated_at_and_version();
create trigger characters_history_before_update before
update
    on
    public.characters for each row execute function characters_history_before_update();


-- public.characters_history definition

-- Drop table

-- DROP TABLE public.characters_history;

CREATE TABLE public.characters_history (
	history_id uuid DEFAULT gen_random_uuid() NOT NULL,
	character_id uuid NOT NULL,
	game_id uuid NOT NULL,
	owner_user_id uuid NOT NULL,
	submitted_at timestamptz NULL,
	approved_at timestamptz NULL,
	approved_by_user_id uuid NULL,
	rejected_at timestamptz NULL,
	rejected_by_user_id uuid NULL,
	rejection_reason text NULL,
	sheet jsonb NOT NULL,
	total_experience int4 NOT NULL,
	spent_experience int4 NOT NULL,
	"version" int4 NOT NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NOT NULL,
	deleted_at timestamptz NULL,
	history_created_at timestamptz DEFAULT now() NOT NULL,
	status_id int2 NULL,
	CONSTRAINT characters_history_pkey PRIMARY KEY (history_id),
	CONSTRAINT characters_history_character_id_fkey FOREIGN KEY (character_id) REFERENCES public."characters"(id) ON DELETE CASCADE
);
CREATE INDEX idx_characters_history_character_id ON public.characters_history USING btree (character_id);
CREATE INDEX idx_characters_history_created_at ON public.characters_history USING btree (history_created_at);


-- public.xp_grants definition

-- Drop table

-- DROP TABLE public.xp_grants;

CREATE TABLE public.xp_grants (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	character_id uuid NOT NULL,
	granted_by_id uuid NOT NULL,
	amount int4 NOT NULL,
	session_date date NOT NULL,
	note text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT chk_xp_grants_amount_positive CHECK ((amount > 0)),
	CONSTRAINT xp_grants_pkey PRIMARY KEY (id),
	CONSTRAINT xp_grants_character_id_fkey FOREIGN KEY (character_id) REFERENCES public."characters"(id) ON DELETE CASCADE,
	CONSTRAINT xp_grants_granted_by_id_fkey FOREIGN KEY (granted_by_id) REFERENCES public.users(id) ON DELETE RESTRICT
);
CREATE INDEX idx_xp_grants_character_id ON public.xp_grants USING btree (character_id);


-- public.xp_spend_logs definition

-- Drop table

-- DROP TABLE public.xp_spend_logs;

CREATE TABLE public.xp_spend_logs (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	character_id uuid NOT NULL,
	requested_by_id uuid NOT NULL,
	resolved_by_id uuid NULL,
	status public."xp_spend_status" DEFAULT 'PENDING'::xp_spend_status NOT NULL,
	xp_cost int4 NOT NULL,
	payload jsonb NOT NULL,
	reason_rejected text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	resolved_at timestamptz NULL,
	CONSTRAINT chk_xp_spend_cost_positive CHECK ((xp_cost > 0)),
	CONSTRAINT xp_spend_logs_pkey PRIMARY KEY (id),
	CONSTRAINT xp_spend_logs_character_id_fkey FOREIGN KEY (character_id) REFERENCES public."characters"(id) ON DELETE CASCADE,
	CONSTRAINT xp_spend_logs_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES public.users(id) ON DELETE RESTRICT,
	CONSTRAINT xp_spend_logs_resolved_by_id_fkey FOREIGN KEY (resolved_by_id) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_xp_spend_logs_character_id ON public.xp_spend_logs USING btree (character_id);
CREATE INDEX idx_xp_spend_logs_status ON public.xp_spend_logs USING btree (status);



-- DROP FUNCTION public.armor(bytea, _text, _text);

CREATE OR REPLACE FUNCTION public.armor(bytea, text[], text[])
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

-- DROP FUNCTION public.armor(bytea);

CREATE OR REPLACE FUNCTION public.armor(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

-- DROP FUNCTION public.characters_history_before_update();

CREATE OR REPLACE FUNCTION public.characters_history_before_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

-- DROP FUNCTION public."citext"(bpchar);

CREATE OR REPLACE FUNCTION public.citext(character)
 RETURNS citext
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$rtrim1$function$
;

-- DROP FUNCTION public."citext"(bool);

CREATE OR REPLACE FUNCTION public.citext(boolean)
 RETURNS citext
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$booltext$function$
;

-- DROP FUNCTION public."citext"(inet);

CREATE OR REPLACE FUNCTION public.citext(inet)
 RETURNS citext
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$network_show$function$
;

-- DROP FUNCTION public.citext_cmp(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_cmp(citext, citext)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_cmp$function$
;

-- DROP FUNCTION public.citext_eq(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_eq(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_eq$function$
;

-- DROP FUNCTION public.citext_ge(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_ge(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_ge$function$
;

-- DROP FUNCTION public.citext_gt(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_gt(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_gt$function$
;

-- DROP FUNCTION public.citext_hash(citext);

CREATE OR REPLACE FUNCTION public.citext_hash(citext)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_hash$function$
;

-- DROP FUNCTION public.citext_hash_extended(citext, int8);

CREATE OR REPLACE FUNCTION public.citext_hash_extended(citext, bigint)
 RETURNS bigint
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_hash_extended$function$
;

-- DROP FUNCTION public.citext_larger(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_larger(citext, citext)
 RETURNS citext
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_larger$function$
;

-- DROP FUNCTION public.citext_le(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_le(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_le$function$
;

-- DROP FUNCTION public.citext_lt(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_lt(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_lt$function$
;

-- DROP FUNCTION public.citext_ne(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_ne(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_ne$function$
;

-- DROP FUNCTION public.citext_pattern_cmp(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_pattern_cmp(citext, citext)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_pattern_cmp$function$
;

-- DROP FUNCTION public.citext_pattern_ge(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_pattern_ge(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_pattern_ge$function$
;

-- DROP FUNCTION public.citext_pattern_gt(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_pattern_gt(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_pattern_gt$function$
;

-- DROP FUNCTION public.citext_pattern_le(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_pattern_le(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_pattern_le$function$
;

-- DROP FUNCTION public.citext_pattern_lt(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_pattern_lt(citext, citext)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_pattern_lt$function$
;

-- DROP FUNCTION public.citext_smaller(citext, citext);

CREATE OR REPLACE FUNCTION public.citext_smaller(citext, citext)
 RETURNS citext
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/citext', $function$citext_smaller$function$
;

-- DROP FUNCTION public.citextin(cstring);

CREATE OR REPLACE FUNCTION public.citextin(cstring)
 RETURNS citext
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$textin$function$
;

-- DROP FUNCTION public.citextout(citext);

CREATE OR REPLACE FUNCTION public.citextout(citext)
 RETURNS cstring
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$textout$function$
;

-- DROP FUNCTION public.citextrecv(internal);

CREATE OR REPLACE FUNCTION public.citextrecv(internal)
 RETURNS citext
 LANGUAGE internal
 STABLE PARALLEL SAFE STRICT
AS $function$textrecv$function$
;

-- DROP FUNCTION public.citextsend(citext);

CREATE OR REPLACE FUNCTION public.citextsend(citext)
 RETURNS bytea
 LANGUAGE internal
 STABLE PARALLEL SAFE STRICT
AS $function$textsend$function$
;

-- DROP FUNCTION public.crypt(text, text);

CREATE OR REPLACE FUNCTION public.crypt(text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_crypt$function$
;

-- DROP FUNCTION public.dearmor(text);

CREATE OR REPLACE FUNCTION public.dearmor(text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_dearmor$function$
;

-- DROP FUNCTION public.decrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.decrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt$function$
;

-- DROP FUNCTION public.decrypt_iv(bytea, bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.decrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$
;

-- DROP FUNCTION public.digest(text, text);

CREATE OR REPLACE FUNCTION public.digest(text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

-- DROP FUNCTION public.digest(bytea, text);

CREATE OR REPLACE FUNCTION public.digest(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

-- DROP FUNCTION public.encrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.encrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt$function$
;

-- DROP FUNCTION public.encrypt_iv(bytea, bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.encrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$
;

-- DROP FUNCTION public.gen_random_bytes(int4);

CREATE OR REPLACE FUNCTION public.gen_random_bytes(integer)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_random_bytes$function$
;

-- DROP FUNCTION public.gen_random_uuid();

CREATE OR REPLACE FUNCTION public.gen_random_uuid()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/pgcrypto', $function$pg_random_uuid$function$
;

-- DROP FUNCTION public.gen_salt(text);

CREATE OR REPLACE FUNCTION public.gen_salt(text)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt$function$
;

-- DROP FUNCTION public.gen_salt(text, int4);

CREATE OR REPLACE FUNCTION public.gen_salt(text, integer)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$
;

-- DROP FUNCTION public.hmac(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.hmac(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

-- DROP FUNCTION public.hmac(text, text, text);

CREATE OR REPLACE FUNCTION public.hmac(text, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

-- DROP AGGREGATE public.max(citext);

CREATE OR REPLACE AGGREGATE public.max(public.citext) (
	SFUNC = citext_larger,
	STYPE = citext,
	SORTOP = >
);

-- DROP AGGREGATE public.min(citext);

CREATE OR REPLACE AGGREGATE public.min(public.citext) (
	SFUNC = citext_smaller,
	STYPE = citext,
	SORTOP = <
);

-- DROP FUNCTION public.pgp_armor_headers(in text, out text, out text);

CREATE OR REPLACE FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text)
 RETURNS SETOF record
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_armor_headers$function$
;

-- DROP FUNCTION public.pgp_key_id(bytea);

CREATE OR REPLACE FUNCTION public.pgp_key_id(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_key_id_w$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt(text, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt(text, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt_bytea(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt(text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt(text, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt_bytea(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

-- DROP FUNCTION public.regexp_match(citext, citext);

CREATE OR REPLACE FUNCTION public.regexp_match(citext, citext)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT pg_catalog.regexp_match( $1::pg_catalog.text, $2::pg_catalog.text, 'i' );
$function$
;

-- DROP FUNCTION public.regexp_match(citext, citext, text);

CREATE OR REPLACE FUNCTION public.regexp_match(citext, citext, text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT pg_catalog.regexp_match( $1::pg_catalog.text, $2::pg_catalog.text, CASE WHEN pg_catalog.strpos($3, 'c') = 0 THEN  $3 || 'i' ELSE $3 END );
$function$
;

-- DROP FUNCTION public.regexp_matches(citext, citext);

CREATE OR REPLACE FUNCTION public.regexp_matches(citext, citext)
 RETURNS SETOF text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT ROWS 1
AS $function$
    SELECT pg_catalog.regexp_matches( $1::pg_catalog.text, $2::pg_catalog.text, 'i' );
$function$
;

-- DROP FUNCTION public.regexp_matches(citext, citext, text);

CREATE OR REPLACE FUNCTION public.regexp_matches(citext, citext, text)
 RETURNS SETOF text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT ROWS 10
AS $function$
    SELECT pg_catalog.regexp_matches( $1::pg_catalog.text, $2::pg_catalog.text, CASE WHEN pg_catalog.strpos($3, 'c') = 0 THEN  $3 || 'i' ELSE $3 END );
$function$
;

-- DROP FUNCTION public.regexp_replace(citext, citext, text, text);

CREATE OR REPLACE FUNCTION public.regexp_replace(citext, citext, text, text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT pg_catalog.regexp_replace( $1::pg_catalog.text, $2::pg_catalog.text, $3, CASE WHEN pg_catalog.strpos($4, 'c') = 0 THEN  $4 || 'i' ELSE $4 END);
$function$
;

-- DROP FUNCTION public.regexp_replace(citext, citext, text);

CREATE OR REPLACE FUNCTION public.regexp_replace(citext, citext, text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT pg_catalog.regexp_replace( $1::pg_catalog.text, $2::pg_catalog.text, $3, 'i');
$function$
;

-- DROP FUNCTION public.regexp_split_to_array(citext, citext);

CREATE OR REPLACE FUNCTION public.regexp_split_to_array(citext, citext)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT pg_catalog.regexp_split_to_array( $1::pg_catalog.text, $2::pg_catalog.text, 'i' );
$function$
;

-- DROP FUNCTION public.regexp_split_to_array(citext, citext, text);

CREATE OR REPLACE FUNCTION public.regexp_split_to_array(citext, citext, text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT pg_catalog.regexp_split_to_array( $1::pg_catalog.text, $2::pg_catalog.text, CASE WHEN pg_catalog.strpos($3, 'c') = 0 THEN  $3 || 'i' ELSE $3 END );
$function$
;

-- DROP FUNCTION public.regexp_split_to_table(citext, citext, text);

CREATE OR REPLACE FUNCTION public.regexp_split_to_table(citext, citext, text)
 RETURNS SETOF text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT pg_catalog.regexp_split_to_table( $1::pg_catalog.text, $2::pg_catalog.text, CASE WHEN pg_catalog.strpos($3, 'c') = 0 THEN  $3 || 'i' ELSE $3 END );
$function$
;

-- DROP FUNCTION public.regexp_split_to_table(citext, citext);

CREATE OR REPLACE FUNCTION public.regexp_split_to_table(citext, citext)
 RETURNS SETOF text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT pg_catalog.regexp_split_to_table( $1::pg_catalog.text, $2::pg_catalog.text, 'i' );
$function$
;

-- DROP FUNCTION public."replace"(citext, citext, citext);

CREATE OR REPLACE FUNCTION public.replace(citext, citext, citext)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT pg_catalog.regexp_replace( $1::pg_catalog.text, pg_catalog.regexp_replace($2::pg_catalog.text, '([^a-zA-Z_0-9])', E'\\\\\\1', 'g'), $3::pg_catalog.text, 'gi' );
$function$
;

-- DROP FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.set_updated_at_and_version();

CREATE OR REPLACE FUNCTION public.set_updated_at_and_version()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.split_part(citext, citext, int4);

CREATE OR REPLACE FUNCTION public.split_part(citext, citext, integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT (pg_catalog.regexp_split_to_array( $1::pg_catalog.text, pg_catalog.regexp_replace($2::pg_catalog.text, '([^a-zA-Z_0-9])', E'\\\\\\1', 'g'), 'i'))[$3];
$function$
;

-- DROP FUNCTION public.strpos(citext, citext);

CREATE OR REPLACE FUNCTION public.strpos(citext, citext)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT pg_catalog.strpos( pg_catalog.lower( $1::pg_catalog.text ), pg_catalog.lower( $2::pg_catalog.text ) );
$function$
;

-- DROP FUNCTION public.texticlike(citext, citext);

CREATE OR REPLACE FUNCTION public.texticlike(citext, citext)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticlike$function$
;

-- DROP FUNCTION public.texticlike(citext, text);

CREATE OR REPLACE FUNCTION public.texticlike(citext, text)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticlike$function$
;

-- DROP FUNCTION public.texticnlike(citext, text);

CREATE OR REPLACE FUNCTION public.texticnlike(citext, text)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticnlike$function$
;

-- DROP FUNCTION public.texticnlike(citext, citext);

CREATE OR REPLACE FUNCTION public.texticnlike(citext, citext)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticnlike$function$
;

-- DROP FUNCTION public.texticregexeq(citext, text);

CREATE OR REPLACE FUNCTION public.texticregexeq(citext, text)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticregexeq$function$
;

-- DROP FUNCTION public.texticregexeq(citext, citext);

CREATE OR REPLACE FUNCTION public.texticregexeq(citext, citext)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticregexeq$function$
;

-- DROP FUNCTION public.texticregexne(citext, text);

CREATE OR REPLACE FUNCTION public.texticregexne(citext, text)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticregexne$function$
;

-- DROP FUNCTION public.texticregexne(citext, citext);

CREATE OR REPLACE FUNCTION public.texticregexne(citext, citext)
 RETURNS boolean
 LANGUAGE internal
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$texticregexne$function$
;

-- DROP FUNCTION public."translate"(citext, citext, text);

CREATE OR REPLACE FUNCTION public.translate(citext, citext, text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
    SELECT pg_catalog.translate( pg_catalog.translate( $1::pg_catalog.text, pg_catalog.lower($2::pg_catalog.text), $3), pg_catalog.upper($2::pg_catalog.text), $3);
$function$
;

-- DROP FUNCTION public.trg_characters_history_fn();

CREATE OR REPLACE FUNCTION public.trg_characters_history_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO characters_history (
    character_id,
    game_id,
    player_id,
    name,
    sheet_phase,
    sheet_json,
    total_experience,
    spent_experience,
    created_at,
    updated_at
  )
  VALUES (
    OLD.id,
    OLD.game_id,
    OLD.player_id,
    OLD.name,
    OLD.sheet_phase,
    OLD.sheet_json,
    OLD.total_experience,
    OLD.spent_experience,
    OLD.created_at,
    OLD.updated_at
  );

  -- Deixa o fluxo normal seguir com o NEW (o update acontece normalmente)
  RETURN NEW;
END;
$function$
;