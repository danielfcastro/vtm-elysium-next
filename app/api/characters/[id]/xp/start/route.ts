// app/api/characters/[id]/xp/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPool } from "@/lib/db";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await requireAuth(req);
    const { id: characterId } = await ctx.params;

    await client.query("BEGIN");

    // Get character and verify ownership
    const charResult = await client.query(
      `SELECT c.id, c.owner_user_id, cs.type as status FROM public.characters c 
       LEFT JOIN public.character_status cs ON cs.id = c.status_id 
       WHERE c.id = $1 AND c.deleted_at IS NULL LIMIT 1`,
      [characterId],
    );

    if (charResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }

    const character = charResult.rows[0];

    if (character.owner_user_id !== user.sub) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow changing to XP status from APPROVED
    if (character.status !== "APPROVED") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Cannot start XP mode from status ${character.status}` },
        { status: 409 },
      );
    }

    // Update status to XP (7)
    await client.query(
      `UPDATE public.characters SET status_id = 7, updated_at = NOW() WHERE id = $1`,
      [characterId],
    );

    await client.query("COMMIT");

    return NextResponse.json({ success: true, status: "XP" });
  } catch (e: any) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
