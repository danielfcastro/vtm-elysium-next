import { NextResponse } from "next/server";
import type { CharacterListItem } from "@/types/app";

/**
 * AJUSTE ESTES IMPORTS para os helpers reais do teu projeto:
 * - db: o mesmo que você já usa nas outras rotas
 * - auth: o mesmo que você já usa em /api/me
 */
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type DbRow = {
  id: string;
  name: string | null;
  game_id: string;
  status_id: number;
  sheet: any;
};

export async function GET(req: Request) {
  try {
    const user = await requireUser(req); // deve validar Bearer e devolver { id, ... }
    const url = new URL(req.url);
    const gameId = url.searchParams.get("gameId");
    console.log("[DEBUG SCAPI] gameId:", gameId, "userId:", user.id);
    if (!gameId) {
      return NextResponse.json(
        { error: "Missing required query param: gameId" },
        { status: 400 },
      );
    }

    // Verifica se é storyteller do jogo (via roles ou via g.storyteller_id)
    const roleRes = await query<{ role: string }>(
      `
                select r.name as role
                from user_game_roles ugr
                join roles r on ugr.role_id = r.id
                where ugr.user_id = $1
                  and ugr.game_id = $2
                UNION
                select 'STORYTELLER' as role
                from games g
                where g.id = $2 and g.storyteller_id = $1
            `,
      [user.id, gameId],
    );

    const roleRows = (roleRes.rows ?? roleRes) as { role: string }[];
    const isStoryteller = roleRows.some((r) => r.role === "STORYTELLER");
    console.log(
      "[DEBUG SCAPI] roleRows:",
      roleRows,
      "isStoryteller:",
      isStoryteller,
    );

    if (!isStoryteller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Lista personagens do jogo
    const res = await query<DbRow>(
      `
                select
                    c.id,
                    coalesce(
                      c.sheet->'sheet'->'sheet'->>'name',
                      c.sheet->'sheet'->>'name',
                      c.sheet->>'name',
                      c.sheet->'draft'->>'name'
                    ) as name,
                    c.game_id,
                    c.status_id,
                    c.sheet
                from characters c
                where c.game_id = $1
                  and c.deleted_at is null
                order by coalesce(c.sheet->'sheet'->'sheet'->>'name', c.sheet->'sheet'->>'name', c.sheet->>'name') asc nulls last, c.created_at asc
            `,
      [gameId],
    );

    const rows: DbRow[] = (res.rows ?? res) as DbRow[];
    console.log("[DEBUG SCAPI] rows found:", rows.length);
    if (rows.length > 0) {
      console.log("[DEBUG SCAPI] sample row name:", rows[0].name);
    }
    const items: CharacterListItem[] = rows.map((r) => {
      const sheet = r.sheet?.sheet ?? r.sheet?.draft ?? r.sheet;
      return {
        id: r.id,
        name: r.name ?? "(Unnamed)",
        gameId: r.game_id,
        statusId: r.status_id,
        isGhoul: sheet?.isGhoul ?? false,
        domitorId: sheet?.domitorId ?? null,
      };
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
