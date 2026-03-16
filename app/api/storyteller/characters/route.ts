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
    if (!gameId) {
      return NextResponse.json(
        { error: "Missing required query param: gameId" },
        { status: 400 },
      );
    }

    // Verifica se é storyteller do jogo
    const roleRes = await query<{ role: "STORYTELLER" | "PLAYER" }>(
      `
                select role
                from user_game_roles
                where user_id = $1
                  and game_id = $2
            `,
      [user.id, gameId],
    );

    const isStoryteller = (roleRes.rows ?? roleRes).some(
      (r: { role: string }) => r.role === "STORYTELLER",
    );

    if (!isStoryteller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Lista personagens do jogo
    const res = await query<DbRow>(
      `
                select
                    c.id,
                    (c.sheet->'sheet'->>'name') as name,
                    c.game_id,
                    c.status_id,
                    c.sheet
                from characters c
                where c.game_id = $1
                  and c.deleted_at is null
                order by (c.sheet->>'name') asc nulls last, c.created_at asc
            `,
      [gameId],
    );

    const rows: DbRow[] = (res.rows ?? res) as DbRow[];
    const items: CharacterListItem[] = rows.map((r) => ({
      id: r.id,
      name: r.name ?? "(Unnamed)",
      gameId: r.game_id,
      statusId: r.status_id,
      isGhoul: r.sheet?.sheet?.isGhoul ?? r.sheet?.isGhoul ?? false,
      domitorId: r.sheet?.sheet?.domitorId ?? r.sheet?.domitorId ?? null,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
