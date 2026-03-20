// app/api/storyteller/games/[gameId]/players/[playerId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type Ctx = {
  params:
    | { gameId: string; playerId: string }
    | Promise<{ gameId: string; playerId: string }>;
};

async function resolveParams(ctx: Ctx) {
  const p = ctx.params instanceof Promise ? await ctx.params : ctx.params;
  return {
    gameId: String(p?.gameId ?? "").trim(),
    playerId: String(p?.playerId ?? "").trim(),
  };
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const client = await pool.connect();
  try {
    const user = await requireAuth(req);
    const { gameId, playerId } = await resolveParams(ctx);

    if (!gameId || !playerId) {
      return jsonError("Missing gameId or playerId", 400);
    }

    const ok = await requireRoleInGame(client, user.sub, gameId, [
      "STORYTELLER",
    ]);
    if (!ok) return jsonError("Forbidden", 403);

    await client.query(
      `DELETE FROM public.user_game_roles WHERE user_id = $1 AND game_id = $2 AND role_id = 1`,
      [playerId, gameId],
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Error removing player:", err);
    return jsonError("Erro ao remover jogador.", 500);
  } finally {
    client.release();
  }
}
