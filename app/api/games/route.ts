//app/api/games/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * @swagger
 * /api/games:
 *   get:
 *     summary: List available games
 *     description: Returns all games the user has access to
 *     tags:
 *       - Games
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of games
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Game'
 *   post:
 *     summary: Create a new game
 *     description: Create a new chronicle/game
 *     tags:
 *       - Games
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               chronicle:
 *                 type: string
 *     responses:
 *       201:
 *         description: Game created
 *       401:
 *         description: Unauthorized
 */

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/games
 * Lista todos os jogos disponíveis (para players criarem personagens).
 * A relação usuário-jogo é estabelecida via personagens, não user_game_roles.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    console.log("[GET /api/games] userId:", user.sub);

    // Return ALL games - relationship is via characters, not user_game_roles
    let { rows } = await pool.query(
      `
      SELECT
        g.id,
        g.name,
        g.description,
        g.storyteller_id AS "storytellerId",
        g.created_at AS "createdAt",
        g.updated_at AS "updatedAt"
      FROM public.games g
      ORDER BY g.created_at DESC
      `,
    );
    console.log("[GET /api/games] games found:", rows.length);

    // Add default XP purchase settings (can be updated after migration runs)
    rows = rows.map((row: any) => ({
      ...row,
      allowBackgroundXpPurchase: true,
      allowMeritFlawsXpPurchase: false,
    }));

    return NextResponse.json({ games: rows }, { status: 200 });
  } catch (e: any) {
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  }
}

/**
 * POST /api/games
 * Cria um jogo e adiciona o criador como STORYTELLER em user_game_roles.
 */
export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const user = await requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const description =
      body?.description != null ? String(body.description) : null;

    if (!name) return jsonError("name is required", 400);
    if (name.length > 120) return jsonError("name is too long", 400);

    await client.query("BEGIN");

    const gameRes = await client.query(
      `
                INSERT INTO public.games (name, description, storyteller_id)
                VALUES ($1, $2, $3)
                    RETURNING
        id, name, description,
        storyteller_id AS "storytellerId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
            `,
      [name, description, user.sub],
    );

    const game = gameRes.rows[0];

    await client.query(
      `
                INSERT INTO public.user_game_roles (user_id, game_id, role)
                VALUES ($1, $2, 'STORYTELLER')
                    ON CONFLICT (user_id, game_id) DO UPDATE SET role = EXCLUDED.role
            `,
      [user.sub, game.id],
    );

    await client.query("COMMIT");
    return NextResponse.json({ game }, { status: 201 });
  } catch (e: any) {
    await client.query("ROLLBACK");
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  } finally {
    client.release();
  }
}
