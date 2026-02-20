// app/api/characters/[id]/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = v ? Number.parseInt(v, 10) : def;
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
}

// GET /api/characters/:id/audit
// Lista a trilha de auditoria daquele personagem
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unauthorized" },
      { status: e?.status ?? 401 },
    );
  }

  const characterId = ctx.params.id;

  const url = new URL(req.url);
  const limit = clampInt(url.searchParams.get("limit"), 50, 1, 200);
  const offset = clampInt(url.searchParams.get("offset"), 0, 0, 1_000_000);

  const pool = getPool();
  const client = await pool.connect();

  try {
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
    const isOwner = character.owner_user_id === user.sub;

    if (!isOwner) {
      const ok = await requireRoleInGame(client, user.sub, character.game_id, [
        "STORYTELLER",
        "ADMIN",
      ]);
      if (!ok)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const r = await client.query(
      `
      SELECT id, character_id, user_id, action_type, payload, created_at
      FROM public.audit_logs
      WHERE character_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [characterId, limit, offset],
    );

    return NextResponse.json(
      { characterId, limit, offset, items: r.rows },
      { status: 200 },
    );
  } finally {
    client.release();
  }
}

// POST /api/characters/:id/audit
// Adiciona uma linha de auditoria para o personagem
//
// Payload sugerido:
// {
//   "actionType": "START" | "FREEBIE" | "XP_SPEND" | ...,
//   "message": "Start | Attribute | Strength: +4 dots (base 1 → 5)",
//   "extra": { ...qualquer json opcional... }
// }
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unauthorized" },
      { status: e?.status ?? 401 },
    );
  }

  const characterId = ctx.params.id;

  const pool = getPool();
  const client = await pool.connect();

  try {
    // 1) Garantir que o personagem existe e não está deletado
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
    const isOwner = character.owner_user_id === user.sub;

    // 2) Permissão: owner OU storyteller/admin do jogo
    if (!isOwner) {
      const ok = await requireRoleInGame(client, user.sub, character.game_id, [
        "STORYTELLER",
        "ADMIN",
      ]);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // 3) Body: { actionType: string; payload?: any }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const { actionType, payload } = (body || {}) as {
      actionType?: string;
      payload?: unknown;
    };

    if (!actionType || typeof actionType !== "string") {
      return NextResponse.json(
        { error: "Invalid body: 'actionType' (string) is required" },
        { status: 400 },
      );
    }

    // 4) Insert na audit_logs
    const inserted = await client.query(
      `
          INSERT INTO public.audit_logs (character_id, user_id, action_type, payload)
          VALUES ($1, $2, $3, $4::jsonb)
          RETURNING id, character_id, user_id, action_type, payload, created_at
        `,
      [characterId, user.sub, actionType, JSON.stringify(payload ?? {})],
    );

    return NextResponse.json(inserted.rows[0], { status: 201 });
  } finally {
    client.release();
  }
}
