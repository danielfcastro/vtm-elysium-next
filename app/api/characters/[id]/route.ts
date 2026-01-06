//app/api/characters/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  //const user = await requireAuth(req);

  //const userId = user.userId; // conforme seu AuthUser
  const user = await requireAuth(req);

  // use id; se algum dia mudar, sub ainda funciona no seu caso (hoje são iguais)
  const userId = user.id ?? user.sub;

  const { id } = await ctx.params;

  const pool = getPool();

  const sql = `
    SELECT
      cs.id,
      cs.game_id AS "gameId",
      cs.owner_user_id AS "ownerUserId",
      cs.status,
      cs.submitted_at AS "submittedAt",
      cs.approved_at AS "approvedAt",
      cs.approved_by_user_id AS "approvedByUserId",
      cs.rejected_at AS "rejectedAt",
      cs.rejected_by_user_id AS "rejectedByUserId",
      cs.rejection_reason AS "rejectionReason",
      cs.sheet,
      cs.total_experience AS "totalExperience",
      cs.spent_experience AS "spentExperience",
      cs.version,
      cs.created_at AS "createdAt",
      cs.updated_at AS "updatedAt",

      g.name AS "gameName",
      g.description AS "gameDescription",
      g.storyteller_id AS "storytellerId"
    FROM characters cs
    JOIN games g ON cs.game_id = g.id
    WHERE
      cs.id = $1
      AND cs.deleted_at IS NULL
      AND (
        cs.owner_user_id = $2
        OR g.storyteller_id = $2
      )
    LIMIT 1;
  `;

  const r = await pool.query(sql, [id, userId]);

  // Não vaza se existe ou não / se tem permissão ou não
  if (r.rowCount === 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ character: r.rows[0] }, { status: 200 });
}
