// app/api/storyteller/characters/[id]/xp/grant/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type GrantBody = {
  amount?: number;
  sessionDate?: string | null;
  note?: string | null;
};

function normalizeAmount(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  if (n <= 0) return null;
  return n;
}

function normalizeSessionDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  // Aceita algo como "2025-01-10". Não precisa ser ultra rígido;
  // se quiser, pode endurecer com regex.
  const s = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return null;
  }
  return s;
}

function todayAsISODate(): string {
  // "YYYY-MM-DD"
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: NextRequest, ctx: RouteParams) {
  // 1. Autenticação
  let user;
  try {
    user = await requireAuth(req);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unauthorized" },
      { status: e?.status ?? 401 },
    );
  }

  const params = await ctx.params;
  const characterId = params.id;

  // 2. Parse do body
  let parsed: GrantBody;
  try {
    parsed = (await req.json()) as GrantBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = normalizeAmount(parsed.amount);
  if (amount === null) {
    return NextResponse.json(
      { error: "amount must be a positive integer" },
      { status: 400 },
    );
  }

  const sessionDate =
    normalizeSessionDate(parsed.sessionDate) ?? todayAsISODate();

  const note =
    typeof parsed.note === "string" && parsed.note.trim().length > 0
      ? parsed.note.trim()
      : null;

  const pool = getPool();
  const client = await pool.connect();

  try {
    // 3. Carrega personagem para verificar jogo / dono / soft delete
    const ch = await client.query<{
      id: string;
      game_id: string;
      owner_user_id: string;
      deleted_at: string | null;
    }>(
      `
      SELECT id, game_id, owner_user_id, deleted_at
      FROM public.characters
      WHERE id = $1
      LIMIT 1
      `,
      [characterId],
    );

    if (ch.rowCount !== 1 || ch.rows[0].deleted_at) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }

    const character = ch.rows[0];

    // 4. Autorização: APENAS STORYTELLER / ADMIN do jogo podem conceder XP
    const ok = await requireRoleInGame(client, user.sub, character.game_id, [
      "STORYTELLER",
      "ADMIN",
    ]);
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5. Insert em xp_grants
    const insert = await client.query<{
      id: string;
      character_id: string;
      amount: number;
      session_date: string;
      note: string | null;
      granted_by_id: string;
      created_at: string;
    }>(
      `
      INSERT INTO public.xp_grants
        (character_id, amount, session_date, note, granted_by_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id::text,
        character_id::text,
        amount::int,
        session_date::text,
        note::text,
        granted_by_id::text,
        created_at::text
      `,
      [characterId, amount, sessionDate, note, user.sub],
    );

    const grant = insert.rows[0];

    // 6. Resposta 201
    return NextResponse.json(
      {
        grant: {
          id: grant.id,
          characterId: grant.character_id,
          amount: grant.amount,
          sessionDate: grant.session_date,
          note: grant.note,
          grantedById: grant.granted_by_id,
          createdAt: grant.created_at,
        },
      },
      { status: 201 },
    );
  } finally {
    client.release();
  }
}
