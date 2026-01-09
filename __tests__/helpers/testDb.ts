// __tests__/helpers/testDb.ts
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

/**
 * Legacy exports (para login.test.ts e me.test.ts)
 */
export const TEST_ST_EMAIL = "st@example.com";
export const TEST_INACTIVE_EMAIL = "inactive@example.com";
export const TEST_PASSWORD = "SenhaForte123";

/**
 * Conservador: não apaga nada por padrão.
 */
export async function resetUsersTable() {
  // intencionalmente vazio
}

/**
 * Gera um tag único por suite (arquivo) para isolar seeds.
 */
export function makeRunTag(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultNameForEmail(email: string) {
  if (email === TEST_ST_EMAIL) return "Storyteller";
  if (email === TEST_INACTIVE_EMAIL) return "Inativo Teste";
  return email.split("@")[0];
}

/**
 * Cria/atualiza um usuário de teste por email e retorna o userId.
 * Usado para isolamento por suite.
 */
export async function seedTestUser(email: string, isActive = true) {
  const hash = await bcrypt.hash(TEST_PASSWORD, 10);

  await pool.query(
    `
      INSERT INTO public.users (email, password_hash, name, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            name          = EXCLUDED.name,
            is_active     = EXCLUDED.is_active
    `,
    [email, hash, defaultNameForEmail(email), isActive],
  );

  return getUserIdByEmail(email);
}

/**
 * Legacy helper: mantém compatibilidade com testes existentes.
 */
export async function seedTestUsers() {
  await seedTestUser(TEST_ST_EMAIL, true);
  await seedTestUser(TEST_INACTIVE_EMAIL, false);
}

export async function getUserIdByEmail(email: string): Promise<string> {
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM public.users WHERE email = $1 LIMIT 1`,
    [email],
  );
  if ((r.rowCount ?? 0) === 0) {
    throw new Error(`Usuário de teste não encontrado para email ${email}`);
  }
  return r.rows[0].id;
}

/**
 * Cria um game válido no schema atual:
 * public.games(name NOT NULL, storyteller_id NOT NULL).
 * Name já fica único para evitar colisões.
 */
export async function ensureTestGameForUser(
  userId: string,
  namePrefix = "Test Game",
) {
  const uniqueName = `${namePrefix}-${Math.random().toString(36).slice(2)}`;

  const r = await pool.query<{ id: string }>(
    `
            INSERT INTO public.games (name, storyteller_id, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
                RETURNING id
        `,
    [uniqueName, userId],
  );

  return r.rows[0].id;
}

/**
 * Seed de character coerente com checks:
 * - SUBMITTED => submitted_at NOT NULL
 * - APPROVED  => approved_at NOT NULL
 * - REJECTED  => rejected_at NOT NULL
 */
export async function seedCharacter(
  ownerUserId: string,
  statusLabel:
    | "DRAFT_PHASE1"
    | "DRAFT_PHASE2"
    | "SUBMITTED"
    | "APPROVED"
    | "REJECTED",
  runTag?: string,
) {
  const gameId = await ensureTestGameForUser(
    ownerUserId,
    `SeedGame${runTag ? "-" + runTag : ""}`,
  );

  const nowIso = new Date().toISOString();
  const isSubmitted = statusLabel === "SUBMITTED";
  const isApproved = statusLabel === "APPROVED";
  const isRejected = statusLabel === "REJECTED";

  const submittedAt = isSubmitted ? nowIso : null;
  const approvedAt = isApproved ? nowIso : null;
  const approvedByUserId = null;
  const rejectedAt = isRejected ? nowIso : null;
  const rejectedByUserId = null;
  const rejectionReason = null;

  const sheet = {
    phase: 1,
    name: "Seeded Character",
    runTag: runTag ?? null,
  };

  const r = await pool.query<{ id: string }>(
    `
            INSERT INTO public.characters (
                game_id,
                owner_user_id,
                status,
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
                       $1,
                       $2,
                       $3::character_status,
                       $4,
                       $5,
                       $6,
                       $7,
                       $8,
                       $9,
                       $10::jsonb,
                       0,
                       0,
                       1,
                       NOW(),
                       NOW(),
                       NULL
                   )
                RETURNING id
        `,
    [
      gameId,
      ownerUserId,
      statusLabel,
      submittedAt,
      approvedAt,
      approvedByUserId,
      rejectedAt,
      rejectedByUserId,
      rejectionReason,
      JSON.stringify(sheet),
    ],
  );

  return { characterId: r.rows[0].id, gameId };
}

/**
 * Cleanup por IDs (não interfere com outras suites).
 */
export async function cleanupTestArtifacts(input: {
  characterIds?: string[];
  gameIds?: string[];
  userEmails?: string[];
}) {
  const { characterIds = [], gameIds = [], userEmails = [] } = input;

  if (characterIds.length > 0) {
    await pool.query(
      `DELETE FROM public.characters WHERE id = ANY($1::uuid[])`,
      [characterIds],
    );
  }

  if (gameIds.length > 0) {
    await pool.query(`DELETE FROM public.games WHERE id = ANY($1::uuid[])`, [
      gameIds,
    ]);
  }

  if (userEmails.length > 0) {
    // IMPORTANT: games.storyteller_id has FK RESTRICT to users.
    // Not every suite collects gameIds, so we also remove games tied to these users.
    await safeExec(
      `DELETE FROM public.games WHERE storyteller_id IN (
         SELECT id FROM public.users WHERE email = ANY($1::text[])
       )`,
      [userEmails],
    );

    await safeExec(
      `DELETE FROM public.user_game_roles WHERE user_id IN (SELECT id FROM public.users WHERE email = ANY($1::text[]))`,
      [userEmails],
    );

    await pool.query(`DELETE FROM public.users WHERE email = ANY($1::text[])`, [
      userEmails,
    ]);
  }
}

async function safeExec(sql: string, params: any[]) {
  try {
    await pool.query(sql, params);
  } catch {
    // silencioso
  }
}
