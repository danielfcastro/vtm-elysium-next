// app/api/storyteller/games/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);

  const res = await pool.query(
    `
    SELECT
      g.id,
      g.name,
      g.description,
      g.storyteller_id AS "storytellerId",
      ugr.role,
      g.created_at AS "createdAt",
      g.updated_at AS "updatedAt"
    FROM public.games g
    JOIN public.user_game_roles ugr
      ON ugr.game_id = g.id
    WHERE ugr.user_id = $1
      AND ugr.role = 'STORYTELLER'
    ORDER BY g.created_at DESC
    `,
    [user.sub],
  );

  return NextResponse.json({ games: res.rows }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const description = body.description
      ? String(body.description).trim()
      : null;

    if (!name || name.length === 0) {
      return NextResponse.json(
        { error: "Nome da crônica é obrigatório." },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const gameResult = await client.query(
        `INSERT INTO public.games (name, description, storyteller_id, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, name, description, storyteller_id AS "storytellerId", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [name, description, user.sub],
      );

      const game = gameResult.rows[0];

      await client.query(
        `INSERT INTO public.user_game_roles (user_id, game_id, role)
         VALUES ($1, $2, 'STORYTELLER')`,
        [user.sub, game.id],
      );

      await client.query("COMMIT");

      return NextResponse.json({ game }, { status: 201 });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error creating game:", err);
    return NextResponse.json(
      { error: "Erro ao criar crônica." },
      { status: 500 },
    );
  }
}
