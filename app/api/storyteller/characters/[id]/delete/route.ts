// app/api/storyteller/characters/[id]/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

async function resolveId(context: RouteContext): Promise<string> {
  const p =
    context.params instanceof Promise ? await context.params : context.params;
  return String(p.id);
}

// DELETE /api/storyteller/characters/[id]/delete
// Permanently deletes a character (soft delete - database cascades to related records)
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const client = await getPool().connect();
  try {
    const user = await requireAuth(req);
    const characterId = await resolveId(ctx);

    // 1) Get character with game info
    const charResult = await client.query(
      `SELECT c.id, c.game_id, c.owner_user_id, c.deleted_at, c.status_id
       FROM public.characters c
       WHERE c.id = $1
       LIMIT 1`,
      [characterId],
    );

    if ((charResult.rowCount ?? 0) === 0) {
      return jsonError("Character not found", 404);
    }

    const character = charResult.rows[0];

    // Check if already soft deleted
    if (character.deleted_at) {
      return jsonError("Character already deleted", 400);
    }

    // 2) Check storyteller role
    const roleResult = await client.query(
      `SELECT r.name as role FROM public.user_game_roles ugr 
       JOIN public.roles r ON ugr.role_id = r.id 
       WHERE ugr.user_id = $1 AND ugr.game_id = $2 AND r.name = 'STORYTELLER'`,
      [user.sub, character.game_id],
    );

    if ((roleResult.rowCount ?? 0) === 0) {
      return jsonError(
        "Forbidden - only storytellers can permanently delete characters",
        403,
      );
    }

    // 3) Soft delete - database will cascade to xp_grants, xp_spend_logs, characters_history, audit_logs
    await client.query(
      `UPDATE public.characters 
       SET deleted_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [characterId],
    );

    return NextResponse.json({
      success: true,
      message: "Character permanently deleted",
    });
  } catch (e: any) {
    return jsonError(e?.message ?? "Internal error", 500);
  } finally {
    client.release();
  }
}
