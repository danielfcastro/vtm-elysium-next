// app/api/characters/[id]/xp/spend-draft/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { requireRoleInGame } from "@/lib/roles";
import { insertPendingXpSpendLog } from "@/lib/xp/xpLedger";
import { XpPointCostStrategy } from "@/core/strategies/XpPointCostStrategy";
import { TraitType } from "@/core/enums/TraitType";

const xpCostStrategy = new XpPointCostStrategy();

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function isInt(n: any) {
  return typeof n === "number" && Number.isInteger(n);
}

type SpendType =
  | "attribute"
  | "ability"
  | "discipline"
  | "background"
  | "virtue"
  | "willpower"
  | "road"
  | "combo"
  | "specialty";

interface SpendItem {
  type: SpendType;
  key: string;
  from: number;
  to: number;
  specialtyName?: string;
  specialtyDescription?: string;
}

function assertSpendBody(body: any): SpendItem[] | { error: string } {
  if (!body || typeof body !== "object")
    return { error: "body must be an object" };
  if (!Array.isArray(body.spends))
    return { error: "body.spends must be an array" };

  const spends: SpendItem[] = [];
  for (const it of body.spends) {
    if (!it || typeof it !== "object")
      return { error: "each spend must be an object" };
    const type = it.type as SpendType;
    if (
      type !== "attribute" &&
      type !== "ability" &&
      type !== "discipline" &&
      type !== "background" &&
      type !== "virtue" &&
      type !== "willpower" &&
      type !== "road" &&
      type !== "combo" &&
      type !== "specialty"
    ) {
      return { error: `invalid spend.type: ${String(it.type)}` };
    }
    if (typeof it.key !== "string" || it.key.trim().length === 0) {
      return { error: "spend.key must be a non-empty string" };
    }
    if (!isInt(it.from) || !isInt(it.to)) {
      return { error: "spend.from and spend.to must be integers" };
    }

    spends.push({
      type,
      key: it.key.trim(),
      from: it.from,
      to: it.to,
      specialtyName: it.specialtyName,
      specialtyDescription: it.specialtyDescription,
    });
  }

  if (spends.length === 0) return { error: "spends must not be empty" };
  return spends;
}

const TRAIT_TYPE_MAP: Record<SpendType, TraitType> = {
  attribute: TraitType.Attribute,
  ability: TraitType.Ability,
  discipline: TraitType.Discipline,
  background: TraitType.Background,
  virtue: TraitType.Virtue,
  willpower: TraitType.Willpower,
  road: TraitType.Humanity,
  combo: TraitType.Discipline,
  specialty: TraitType.Ability,
};

function xpCostFor(type: SpendType, from: number, to: number): number {
  if (type === "specialty") {
    return 0; // Specialties are free when trait is 4+
  }
  if (type === "combo") {
    return to; // Use the 'to' value which contains the combo cost (20)
  }
  const traitType = TRAIT_TYPE_MAP[type];
  const isClanTrait = false;
  return xpCostStrategy.getCost(traitType, from, isClanTrait);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req);
    const { id: characterId } = await ctx.params;

    const body = await req.json().catch(() => null);
    const parsed = assertSpendBody(body);
    if (Array.isArray(parsed) === false) {
      return jsonError(422, "INVALID_BODY", parsed.error);
    }
    const spends = parsed;

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const c = await client.query<{
        id: string;
        owner_user_id: string;
        game_id: string;
        status: string;
        deleted_at: string | null;
        sheet: any;
        total_experience: number;
        spent_experience: number;
      }>(
        `
          SELECT
            cs.id,
            cs.owner_user_id,
            cs.game_id,
            cs2.type as status,
            cs.deleted_at,
            cs.sheet,
            cs.total_experience,
            cs.spent_experience
          FROM public.characters cs
          LEFT JOIN public.character_status cs2 ON cs2.id = cs.status_id
          WHERE cs.id = $1
          FOR UPDATE OF cs
        `,
        [characterId],
      );

      if ((c.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return jsonError(404, "NOT_FOUND", "Character not found");
      }

      const character = c.rows[0];
      if (character.deleted_at) {
        await client.query("ROLLBACK");
        return jsonError(404, "NOT_FOUND", "Character not found");
      }

      const isOwner = character.owner_user_id === user.sub;
      let canAccess = isOwner;

      if (!canAccess) {
        const g = await client.query<{ storyteller_id: string }>(
          `SELECT storyteller_id FROM public.games WHERE id = $1 LIMIT 1`,
          [character.game_id],
        );

        if ((g.rowCount ?? 0) > 0 && g.rows[0].storyteller_id === user.sub) {
          canAccess = true;
        } else {
          canAccess = await requireRoleInGame(
            client,
            user.sub,
            character.game_id,
            ["STORYTELLER", "ADMIN"],
          );
        }
      }

      if (!canAccess) {
        await client.query("ROLLBACK");
        return jsonError(
          403,
          "FORBIDDEN",
          "You do not have access to this character",
        );
      }

      if (
        String(character.status) !== "APPROVED" &&
        String(character.status) !== "XP"
      ) {
        await client.query("ROLLBACK");
        return jsonError(
          409,
          "INVALID_STATE",
          "XP spend is only allowed for APPROVED or XP characters",
        );
      }

      const sheet = character.sheet;
      if (!sheet || typeof sheet !== "object") {
        await client.query("ROLLBACK");
        return jsonError(422, "INVALID_SHEET", "Character sheet is invalid");
      }

      const itemsWithCost = spends.map((s) => ({
        ...s,
        cost: xpCostFor(s.type, s.from, s.to),
      }));
      const totalCost = itemsWithCost.reduce((acc, it) => acc + it.cost, 0);

      if (totalCost <= 0) {
        await client.query("ROLLBACK");
        return jsonError(422, "INVALID_SPEND", "Total cost must be > 0");
      }

      const granted = Number(character.total_experience ?? 0);
      const spent = Number(character.spent_experience ?? 0);
      const remaining = granted - spent;

      if (remaining < totalCost) {
        await client.query("ROLLBACK");
        return jsonError(
          422,
          "INSUFFICIENT_XP",
          `Insufficient XP (remaining ${remaining}, need ${totalCost})`,
        );
      }

      const spendPayload = {
        spends: itemsWithCost,
        totalCost,
        totalsBefore: { granted, spent, remaining },
      };

      await client.query(
        `DELETE FROM public.xp_spend_logs WHERE character_id = $1 AND status_id = 3`,
        [characterId],
      );

      const { id: spendLogId } = await insertPendingXpSpendLog(client, {
        characterId,
        requestedById: user.sub,
        xpCost: totalCost,
        payload: spendPayload,
      });

      // Create one audit log entry per trait
      for (const spend of spends) {
        const spendDetail = `${spend.key}: ${spend.from} → ${spend.to}`;
        const cost = xpCostFor(spend.type, spend.from, spend.to);
        const auditMessage = `XP | Pending Spend Request | Cost: ${cost} XP | Remaining: ${remaining} XP | ${spendDetail}`;
        await client.query(
          `INSERT INTO public.audit_logs (character_id, user_id, action_type_id, payload) VALUES ($1, $2, 3, $3)`,
          [characterId, user.sub, JSON.stringify({ message: auditMessage })],
        );
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          characterId,
          spendLogId,
          xp: {
            total: granted,
            spent: spent,
            remaining: remaining,
            pendingCost: totalCost,
          },
          spends: spends,
        },
        { status: 200 },
      );
    } catch (err: any) {
      try {
        await client.query("ROLLBACK");
      } catch {
        console.log(err);
      }

      const httpStatus =
        typeof err?.httpStatus === "number" ? err.httpStatus : 500;
      const code = typeof err?.code === "string" ? err.code : "INTERNAL_ERROR";
      const message =
        typeof err?.message === "string"
          ? err?.message
          : "Internal Server Error";

      return jsonError(httpStatus, code, message);
    } finally {
      client.release();
    }
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    const msg =
      typeof err?.message === "string" ? err?.message : "Internal Server Error";
    return jsonError(
      status,
      status === 401 ? "UNAUTHORIZED" : "INTERNAL_ERROR",
      msg,
    );
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth(req);
    const { id: characterId } = await ctx.params;

    const pool = getPool();
    const client = await pool.connect();

    try {
      const pendingResult = await client.query(
        `
          SELECT 
            s.id,
            s.requested_by_id,
            s.xp_cost,
            s.payload,
            s.created_at
          FROM public.xp_spend_logs s
          WHERE s.character_id = $1 AND s.status_id = 3
          ORDER BY s.created_at DESC
        `,
        [characterId],
      );

      const pendingSpends = pendingResult.rows.map((row) => ({
        id: row.id,
        requestedById: row.requested_by_id,
        xpCost: row.xp_cost,
        payload: row.payload,
        createdAt: row.created_at,
      }));

      const totalPendingXp = pendingSpends.reduce(
        (sum, p) => sum + Number(p.xpCost),
        0,
      );

      const xpResult = await client.query(
        `
          SELECT 
            COALESCE(cs.total_experience, 0)::int AS total_experience,
            COALESCE(cs.spent_experience, 0)::int AS spent_experience
          FROM public.characters cs
          WHERE cs.id = $1
        `,
        [characterId],
      );

      const total = Number(xpResult.rows[0]?.total_experience ?? 0);
      const spent = Number(xpResult.rows[0]?.spent_experience ?? 0);

      return NextResponse.json(
        {
          pendingSpends,
          totalPendingXp,
          xp: {
            total,
            spent,
            available: total - spent - totalPendingXp,
          },
        },
        { status: 200 },
      );
    } finally {
      client.release();
    }
  } catch (err: any) {
    return jsonError(500, "INTERNAL_ERROR", err?.message ?? "Internal error");
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req);
    const { id: characterId } = await ctx.params;

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const c = await client.query(
        `SELECT id, owner_user_id FROM public.characters WHERE id = $1`,
        [characterId],
      );

      if ((c.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return jsonError(404, "NOT_FOUND", "Character not found");
      }

      const character = c.rows[0];
      if (character.owner_user_id !== user.sub) {
        await client.query("ROLLBACK");
        return jsonError(
          403,
          "FORBIDDEN",
          "Only the character owner can cancel pending XP spends",
        );
      }

      const deleteResult = await client.query(
        `DELETE FROM public.xp_spend_logs WHERE character_id = $1 AND status_id = 3 RETURNING id`,
        [characterId],
      );

      if ((deleteResult.rowCount ?? 0) > 0) {
        const auditMessage = `XP | Pending Spend Cancelled | By: Player`;
        await client.query(
          `INSERT INTO public.audit_logs (character_id, user_id, action_type_id, payload) VALUES ($1, $2, 3, $3)`,
          [characterId, user.sub, JSON.stringify({ message: auditMessage })],
        );
      }

      await client.query("COMMIT");

      return NextResponse.json(
        { deleted: deleteResult.rowCount },
        { status: 200 },
      );
    } catch (err: any) {
      try {
        await client.query("ROLLBACK");
      } catch {
        console.log(err);
      }
      return jsonError(500, "INTERNAL_ERROR", err?.message ?? "Internal error");
    } finally {
      client.release();
    }
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    const msg =
      typeof err?.message === "string" ? err?.message : "Internal Server Error";
    return jsonError(
      status,
      status === 401 ? "UNAUTHORIZED" : "INTERNAL_ERROR",
      msg,
    );
  }
}
