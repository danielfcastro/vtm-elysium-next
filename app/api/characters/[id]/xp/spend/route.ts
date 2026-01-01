// app/api/characters/[id]/xp/spend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { requireRoleInGame } from "@/lib/roles";
import {
  SpendItem,
  SpendType,
  getCurrentLevel,
  spendXpImmediate,
} from "@/lib/xp/xpSpendService";

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function isInt(n: any) {
  return typeof n === "number" && Number.isInteger(n);
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
      type !== "road"
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
    });
  }

  if (spends.length === 0) return { error: "spends must not be empty" };
  return spends;
}

function ensurePlainObject(v: any) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
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

    // Enforce step-by-step progression (from -> to must be +1)
    for (const s of spends) {
      if (s.to !== s.from + 1) {
        return jsonError(
          422,
          "INVALID_SPEND",
          `Spend must increase exactly one level (from ${s.from} to ${s.to})`,
        );
      }
      if (s.to <= 0) {
        return jsonError(422, "INVALID_SPEND", "Target level must be >= 1");
      }
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // lock character row
      const c = await client.query<{
        id: string;
        owner_user_id: string;
        game_id: string;
        status: string;
        deleted_at: string | null;
        sheet: any;
      }>(
        `
          SELECT
            id,
            owner_user_id,
            game_id,
            status::text as status,
            deleted_at,
            sheet
          FROM public.characters
          WHERE id = $1
          FOR UPDATE
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

      // authz: owner OR storyteller role OR games.storyteller_id
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

      if (String(character.status) !== "APPROVED") {
        await client.query("ROLLBACK");
        return jsonError(
          409,
          "INVALID_STATE",
          "XP spend is only allowed for APPROVED characters",
        );
      }

      const sheet = character.sheet;
      if (!ensurePlainObject(sheet) || !ensurePlainObject(sheet.draft)) {
        await client.query("ROLLBACK");
        return jsonError(422, "INVALID_SHEET", "Character sheet is invalid");
      }

      // Validate "from" matches sheet state
      for (const s of spends) {
        const current = getCurrentLevel(sheet, s);
        if (current !== s.from) {
          await client.query("ROLLBACK");
          return jsonError(
            422,
            "INVALID_SPEND",
            `Spend 'from' mismatch for ${s.type}:${s.key} (expected ${current}, got ${s.from})`,
          );
        }
      }

      // Spend XP (Option A): ledger + immediate apply
      const result = await spendXpImmediate(client, {
        characterId,
        userId: user.sub,
        sheet,
        spends,
      });

      await client.query("COMMIT");

      return NextResponse.json(
        {
          characterId,
          sheet: result.sheet,
          xp: {
            total: result.totalsAfter.granted,
            spent: result.totalsAfter.spent,
            remaining: result.totalsAfter.remaining,
            lastSpendCost: result.lastSpendCost,
          },
          spendLogId: result.spendLogId,
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
          ? err.message
          : "Internal Server Error";

      return jsonError(httpStatus, code, message);
    } finally {
      client.release();
    }
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    const msg =
      typeof err?.message === "string" ? err.message : "Internal Server Error";
    return jsonError(
      status,
      status === 401 ? "UNAUTHORIZED" : "INTERNAL_ERROR",
      msg,
    );
  }
}
