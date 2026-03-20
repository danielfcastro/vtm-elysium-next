// src/lib/roles.ts
import { PoolClient } from "pg";

export async function requireRoleInGame(
  client: PoolClient,
  userId: string,
  gameId: string,
  allowed: string[],
) {
  const r = await client.query(
    `SELECT r.name as role FROM public.user_game_roles ugr 
     JOIN public.roles r ON ugr.role_id = r.id 
     WHERE ugr.user_id = $1 AND ugr.game_id = $2 LIMIT 1`,
    [userId, gameId],
  );

  if ((r.rowCount ?? 0) === 0) return false;
  return allowed.includes(String(r.rows[0].role));
}
