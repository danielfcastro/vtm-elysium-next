// src/lib/xp/xpLedger.ts
// Ledger-based XP totals. Source of truth: xp_grants + xp_spend_logs.

import type { PoolClient } from "pg";

export type XpTotals = {
  granted: number;
  spent: number;
  remaining: number;
};

/**
 * Totals are derived from the ledger tables.
 * granted = SUM(xp_grants.amount)
 * spent   = SUM(xp_spend_logs.xp_cost) WHERE status = 'APPROVED'
 */
export async function getXpTotalsForCharacter(
  client: PoolClient,
  characterId: string,
): Promise<XpTotals> {
  const r = await client.query<{ granted: number; spent: number }>(
    `
      SELECT
        COALESCE((SELECT SUM(amount) FROM public.xp_grants WHERE character_id = $1), 0)::int AS granted,
        COALESCE((SELECT SUM(xp_cost) FROM public.xp_spend_logs WHERE character_id = $1 AND status = 'APPROVED'), 0)::int AS spent
    `,
    [characterId],
  );

  const granted = Number(r.rows[0]?.granted ?? 0);
  const spent = Number(r.rows[0]?.spent ?? 0);
  return {
    granted,
    spent,
    remaining: granted - spent,
  };
}

export async function insertApprovedXpSpendLog(
  client: PoolClient,
  args: {
    characterId: string;
    requestedById: string;
    xpCost: number;
    payload: unknown;
  },
): Promise<{ id: string }> {
  const { characterId, requestedById, xpCost, payload } = args;

  const r = await client.query<{ id: string }>(
    `
      INSERT INTO public.xp_spend_logs
        (character_id, requested_by_id, resolved_by_id, status, xp_cost, payload, resolved_at)
      VALUES
        ($1, $2, $2, 'APPROVED', $3, $4::jsonb, NOW())
      RETURNING id
    `,
    [characterId, requestedById, xpCost, JSON.stringify(payload)],
  );

  return { id: r.rows[0].id };
}

export async function insertPendingXpSpendLog(
  client: PoolClient,
  args: {
    characterId: string;
    requestedById: string;
    xpCost: number;
    payload: unknown;
  },
): Promise<{ id: string }> {
  const { characterId, requestedById, xpCost, payload } = args;

  const r = await client.query<{ id: string }>(
    `
      INSERT INTO public.xp_spend_logs
        (character_id, requested_by_id, status, xp_cost, payload)
      VALUES
        ($1, $2, 'PENDING', $3, $4::jsonb)
      RETURNING id
    `,
    [characterId, requestedById, xpCost, JSON.stringify(payload)],
  );

  return { id: r.rows[0].id };
}
