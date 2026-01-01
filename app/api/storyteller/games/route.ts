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
