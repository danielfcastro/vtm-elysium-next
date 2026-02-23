// app/api/storyteller/games/[gameId]/players/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type Ctx = { params: { gameId: string } | Promise<{ gameId: string }> };

async function resolveGameId(ctx: Ctx) {
  const p = ctx.params instanceof Promise ? await ctx.params : ctx.params;
  return String(p?.gameId ?? "").trim();
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const client = await pool.connect();
  try {
    const user = await requireAuth(req);
    const gameId = await resolveGameId(ctx);
    if (!gameId) return jsonError("Missing gameId", 400);

    const ok = await requireRoleInGame(client, user.sub, gameId, [
      "STORYTELLER",
    ]);
    if (!ok) return jsonError("Forbidden", 403);

    const res = await client.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        ugr.role,
        ugr.joined_at AS "joinedAt",
        c.id AS "characterId",
        c.name AS "characterName",
        c.status_id AS "characterStatusId"
      FROM public.users u
      JOIN public.user_game_roles ugr ON ugr.user_id = u.id
      LEFT JOIN public.characters c ON c.owner_user_id = u.id AND c.game_id = $1 AND c.deleted_at IS NULL
      WHERE ugr.game_id = $1
        AND ugr.role = 'PLAYER'
      ORDER BY ugr.joined_at DESC
      `,
      [gameId],
    );

    const players = res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      joinedAt: row.joinedAt,
      character: row.characterId
        ? {
            id: row.characterId,
            name: row.characterName,
            statusId: row.characterStatusId,
          }
        : null,
    }));

    return NextResponse.json({ players }, { status: 200 });
  } catch (err) {
    console.error("Error fetching players:", err);
    return jsonError("Erro ao buscar jogadores.", 500);
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const client = await pool.connect();
  try {
    const user = await requireAuth(req);
    const gameId = await resolveGameId(ctx);
    if (!gameId) return jsonError("Missing gameId", 400);

    const ok = await requireRoleInGame(client, user.sub, gameId, [
      "STORYTELLER",
    ]);
    if (!ok) return jsonError("Forbidden", 403);

    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = body.password
      ? String(body.password)
      : Math.random().toString(36).slice(-8);
    const nature = body.nature ? String(body.nature).trim() : null;
    const demeanor = body.demeanor ? String(body.demeanor).trim() : null;

    if (!name || name.length < 2) {
      return jsonError("Nome deve ter pelo menos 2 caracteres.", 400);
    }

    if (!email || !email.includes("@")) {
      return jsonError("Email inválido.", 400);
    }

    if (body.password && body.password.length < 6) {
      return jsonError("Senha deve ter pelo menos 6 caracteres.", 400);
    }

    const existingUser = await client.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );

    if (existingUser.rows.length > 0) {
      return jsonError("Email já cadastrado no sistema.", 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (email, name, password_hash, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())
       RETURNING id, email, name`,
      [email, name, passwordHash],
    );

    const newUser = userResult.rows[0];

    await client.query(
      `INSERT INTO user_game_roles (user_id, game_id, role, joined_at)
       VALUES ($1, $2, 'PLAYER', NOW())`,
      [newUser.id, gameId],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        player: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: "PLAYER",
          character: null,
          generatedPassword: !body.password ? password : null,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating player:", err);
    return jsonError("Erro ao criar jogador.", 500);
  } finally {
    client.release();
  }
}
