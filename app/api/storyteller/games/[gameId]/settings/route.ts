// app/api/storyteller/games/[gameId]/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const user = await requireAuth(req);
    const { gameId } = await params;

    const body = await req.json().catch(() => ({}));
    
    // Verify the user is the storyteller of this game
    const gameCheck = await pool.query(
      `
      SELECT id FROM public.games
      WHERE id = $1 AND storyteller_id = $2
      LIMIT 1
      `,
      [gameId, user.sub],
    );

    if (gameCheck.rows.length === 0) {
      return jsonError("Game not found or you are not the storyteller", 403);
    }

    const allowBackgroundXpPurchase = body.allowBackgroundXpPurchase;
    const allowMeritFlawsXpPurchase = body.allowMeritFlawsXpPurchase;

    // Update the game settings
    const { rows } = await pool.query(
      `
      UPDATE public.games
      SET 
        allow_background_xp_purchase = COALESCE($1, allow_background_xp_purchase),
        allow_merit_flaws_xp_purchase = COALESCE($2, allow_merit_flaws_xp_purchase),
        updated_at = NOW()
      WHERE id = $3
      RETURNING 
        id, 
        name, 
        description, 
        storyteller_id AS "storytellerId",
        allow_background_xp_purchase AS "allowBackgroundXpPurchase",
        allow_merit_flaws_xp_purchase AS "allowMeritFlawsXpPurchase",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        allowBackgroundXpPurchase !== undefined ? allowBackgroundXpPurchase : null,
        allowMeritFlawsXpPurchase !== undefined ? allowMeritFlawsXpPurchase : null,
        gameId,
      ],
    );

    return NextResponse.json({ game: rows[0] }, { status: 200 });
  } catch (e: any) {
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const user = await requireAuth(req);
    const { gameId } = await params;

    // Verify the user is the storyteller of this game
    const gameCheck = await pool.query(
      `
      SELECT id FROM public.games
      WHERE id = $1 AND storyteller_id = $2
      LIMIT 1
      `,
      [gameId, user.sub],
    );

    if (gameCheck.rows.length === 0) {
      return jsonError("Game not found or you are not the storyteller", 403);
    }

    const { rows } = await pool.query(
      `
      SELECT 
        id, 
        name, 
        description, 
        storyteller_id AS "storytellerId",
        allow_background_xp_purchase AS "allowBackgroundXpPurchase",
        allow_merit_flaws_xp_purchase AS "allowMeritFlawsXpPurchase",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM public.games
      WHERE id = $1
      `,
      [gameId],
    );

    return NextResponse.json({ game: rows[0] }, { status: 200 });
  } catch (e: any) {
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  }
}
