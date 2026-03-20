// app/api/storyteller/characters/[id]/archive/route.ts
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

// POST /api/storyteller/characters/[id]/archive
// Archives a character (sets status_id to 6)
export async function POST(req: NextRequest, ctx: RouteContext) {
  const client = await getPool().connect();
  try {
    const user = await requireAuth(req);
    const characterId = await resolveId(ctx);

    // 1) Get character with game info
    const charResult = await client.query(
      `SELECT c.id, c.game_id, c.status_id, c.deleted_at
       FROM public.characters c
       WHERE c.id = $1 AND c.deleted_at IS NULL
       LIMIT 1`,
      [characterId],
    );

    if ((charResult.rowCount ?? 0) === 0) {
      return jsonError("Character not found", 404);
    }

    const character = charResult.rows[0];

    // 2) Check storyteller role
    const roleResult = await client.query(
      `SELECT r.name as role FROM public.user_game_roles ugr 
       JOIN public.roles r ON ugr.role_id = r.id 
       WHERE ugr.user_id = $1 AND ugr.game_id = $2 AND r.name = 'STORYTELLER'`,
      [user.sub, character.game_id],
    );

    if ((roleResult.rowCount ?? 0) === 0) {
      return jsonError(
        "Forbidden - only storytellers can archive characters",
        403,
      );
    }

    // 3) Store previous status for unarchive
    const previousStatusId = character.status_id;

    // 4) Archive the character (set status_id to 6)
    await client.query(
      `UPDATE public.characters SET status_id = 6, updated_at = NOW() WHERE id = $1`,
      [characterId],
    );

    // 5) Insert audit log
    await client.query(
      `INSERT INTO public.audit_logs (character_id, user_id, action_type_id, payload)
       VALUES ($1, $2, 3, $3)`,
      [
        characterId,
        user.sub,
        JSON.stringify({
          message: `Character archived by storyteller. Previous status: ${previousStatusId}`,
        }),
      ],
    );

    return NextResponse.json({
      success: true,
      message: "Character archived",
      previousStatusId,
    });
  } catch (e: any) {
    return jsonError(e?.message ?? "Internal error", 500);
  } finally {
    client.release();
  }
}

// DELETE /api/storyteller/characters/[id]/archive
// Unarchives a character (restores previous status)
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const client = await getPool().connect();
  try {
    const user = await requireAuth(req);
    const characterId = await resolveId(ctx);

    // 1) Get character with game info
    const charResult = await client.query(
      `SELECT c.id, c.game_id, c.status_id, c.deleted_at
       FROM public.characters c
       WHERE c.id = $1 AND c.deleted_at IS NULL
       LIMIT 1`,
      [characterId],
    );

    if ((charResult.rowCount ?? 0) === 0) {
      return jsonError("Character not found", 404);
    }

    const character = charResult.rows[0];

    // 2) Check if character is archived
    if (character.status_id !== 6) {
      return jsonError("Character is not archived", 400);
    }

    // 3) Check storyteller role
    const roleResult = await client.query(
      `SELECT r.name as role FROM public.user_game_roles ugr 
       JOIN public.roles r ON ugr.role_id = r.id 
       WHERE ugr.user_id = $1 AND ugr.game_id = $2 AND r.name = 'STORYTELLER'`,
      [user.sub, character.game_id],
    );

    if ((roleResult.rowCount ?? 0) === 0) {
      return jsonError(
        "Forbidden - only storytellers can unarchive characters",
        403,
      );
    }

    // 4) Check if there's previous status stored in sheet or use default (APPROVED = 4)
    // Try to find the previous status from audit logs or default to APPROVED
    const auditResult = await client.query(
      `SELECT payload FROM public.audit_logs 
       WHERE character_id = $1 AND action_type_id = 3
       ORDER BY created_at DESC
       LIMIT 1`,
      [characterId],
    );

    let restoreStatusId = 4; // Default to APPROVED
    if ((auditResult.rowCount ?? 0) > 0) {
      const payload = auditResult.rows[0]?.payload;
      if (payload?.message?.includes("Previous status:")) {
        const match = payload.message.match(/Previous status: (\d+)/);
        if (match) {
          restoreStatusId = parseInt(match[1], 10);
        }
      }
    }

    // 5) Unarchive the character (restore previous status)
    await client.query(
      `UPDATE public.characters SET status_id = $1, updated_at = NOW() WHERE id = $2`,
      [restoreStatusId, characterId],
    );

    // 6) Insert audit log
    await client.query(
      `INSERT INTO public.audit_logs (character_id, user_id, action_type_id, payload)
       VALUES ($1, $2, 3, $3)`,
      [
        characterId,
        user.sub,
        JSON.stringify({
          message: `Character unarchived by storyteller. Restored to status: ${restoreStatusId}`,
        }),
      ],
    );

    return NextResponse.json({
      success: true,
      message: "Character unarchived",
      restoredStatusId: restoreStatusId,
    });
  } catch (e: any) {
    return jsonError(e?.message ?? "Internal error", 500);
  } finally {
    client.release();
  }
}
