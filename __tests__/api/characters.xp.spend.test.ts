// __tests__/api/characters.xp.spend.test.ts
import { SignJWT } from "jose";
import { pool } from "@/lib/db";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
  cleanupTestArtifacts,
  makeRunTag,
  seedCharacter,
  seedTestUser,
} from "../helpers/testDb";
import { buildZeroSheet } from "@/lib/sheet";
import { POST } from "@/app/api/characters/[id]/xp/spend/route";

function secretKey() {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

async function makeToken(payload: {
  sub: string;
  email: string;
  name: string;
}) {
  return await new SignJWT({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secretKey());
}

async function grantXp(args: {
  characterId: string;
  grantedById: string;
  amount: number;
}) {
  const { characterId, grantedById, amount } = args;
  await pool.query(
    `
      INSERT INTO public.xp_grants (character_id, granted_by_id, amount, session_date, note)
      VALUES ($1, $2, $3, CURRENT_DATE, 'test')
    `,
    [characterId, grantedById, amount],
  );
}

describe("POST /api/characters/:id/xp/spend", () => {
  const runTag = makeRunTag("xp-spend");

  const userEmail = `xp_user_${runTag}@example.com`;
  const otherEmail = `xp_other_${runTag}@example.com`;

  const createdCharacterIds: string[] = [];
  const createdGameIds: string[] = [];
  const createdUserEmails: string[] = [userEmail, otherEmail];

  afterAll(async () => {
    await cleanupTestArtifacts({
      characterIds: createdCharacterIds,
      gameIds: createdGameIds,
      userEmails: createdUserEmails,
    });
    await pool.end();
  });

  test("401 sem Authorization header", async () => {
    const { characterId } = await seedCharacter(
      await seedTestUser(userEmail, true),
      "APPROVED",
      runTag,
    );
    createdCharacterIds.push(characterId);

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${characterId}/xp/spend`,
      "POST",
      {
        spends: [{ type: "ability", key: "alertness", from: 1, to: 2 }],
      },
    );

    const res = await POST(req as any, {
      params: Promise.resolve({ id: characterId }),
    });
    expect(res.status).toBe(401);
  });

  test("403 quando token for de outro usuário", async () => {
    const ownerId = await seedTestUser(userEmail, true);
    const otherId = await seedTestUser(otherEmail, true);

    const { characterId } = await seedCharacter(ownerId, "APPROVED", runTag);
    createdCharacterIds.push(characterId);

    const sheet = buildZeroSheet();
    sheet.draft.abilities = { alertness: 1 };
    await pool.query(
      `UPDATE public.characters SET sheet = $1::jsonb WHERE id = $2`,
      [JSON.stringify(sheet), characterId],
    );

    // Ensure XP is sufficient (ledger)
    await grantXp({ characterId, grantedById: ownerId, amount: 50 });

    const token = await makeToken({
      sub: otherId,
      email: otherEmail,
      name: "Other",
    });

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${characterId}/xp/spend`,
      "POST",
      { spends: [{ type: "ability", key: "alertness", from: 1, to: 2 }] },
      { Authorization: `Bearer ${token}` },
    );

    const res = await POST(req as any, {
      params: Promise.resolve({ id: characterId }),
    });
    expect(res.status).toBe(403);
  });

  test("409 quando status != APPROVED", async () => {
    const ownerId = await seedTestUser(userEmail, true);

    const { characterId } = await seedCharacter(
      ownerId,
      "DRAFT_PHASE1",
      runTag,
    );
    createdCharacterIds.push(characterId);

    const token = await makeToken({
      sub: ownerId,
      email: userEmail,
      name: "Owner",
    });

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${characterId}/xp/spend`,
      "POST",
      { spends: [{ type: "ability", key: "alertness", from: 0, to: 1 }] },
      { Authorization: `Bearer ${token}` },
    );

    const res = await POST(req as any, {
      params: Promise.resolve({ id: characterId }),
    });
    expect(res.status).toBe(409);
  });

  test("422 quando XP insuficiente", async () => {
    const ownerId = await seedTestUser(userEmail, true);

    const { characterId } = await seedCharacter(ownerId, "APPROVED", runTag);
    createdCharacterIds.push(characterId);

    const sheet = buildZeroSheet();
    sheet.draft.attributes = { strength: 1 };
    await pool.query(
      `UPDATE public.characters SET sheet = $1::jsonb WHERE id = $2`,
      [JSON.stringify(sheet), characterId],
    );

    // Grant only 3 XP (Attribute to=2 costs 8)
    await grantXp({ characterId, grantedById: ownerId, amount: 3 });

    const token = await makeToken({
      sub: ownerId,
      email: userEmail,
      name: "Owner",
    });

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${characterId}/xp/spend`,
      "POST",
      { spends: [{ type: "attribute", key: "strength", from: 1, to: 2 }] },
      { Authorization: `Bearer ${token}` },
    );

    const res = await POST(req as any, {
      params: Promise.resolve({ id: characterId }),
    });
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.error.code).toBe("INSUFFICIENT_XP");
  });

  test("422 quando pula nível (from->to não é +1)", async () => {
    const ownerId = await seedTestUser(userEmail, true);

    const { characterId } = await seedCharacter(ownerId, "APPROVED", runTag);
    createdCharacterIds.push(characterId);

    const sheet = buildZeroSheet();
    sheet.draft.abilities = { alertness: 1 };
    await pool.query(
      `UPDATE public.characters SET sheet = $1::jsonb WHERE id = $2`,
      [JSON.stringify(sheet), characterId],
    );

    await grantXp({ characterId, grantedById: ownerId, amount: 999 });

    const token = await makeToken({
      sub: ownerId,
      email: userEmail,
      name: "Owner",
    });

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${characterId}/xp/spend`,
      "POST",
      { spends: [{ type: "ability", key: "alertness", from: 1, to: 3 }] },
      { Authorization: `Bearer ${token}` },
    );

    const res = await POST(req as any, {
      params: Promise.resolve({ id: characterId }),
    });
    expect(res.status).toBe(422);
  });

  test("200 e atualiza sheet + spent_experience em transação", async () => {
    const ownerId = await seedTestUser(userEmail, true);
    const { characterId } = await seedCharacter(ownerId, "APPROVED", runTag);
    createdCharacterIds.push(characterId);

    const sheet = buildZeroSheet();
    sheet.draft.abilities = { alertness: 1 };
    sheet.draft.maxTraitRating = 5;

    await pool.query(
      `UPDATE public.characters SET sheet = $1::jsonb WHERE id = $2`,
      [JSON.stringify(sheet), characterId],
    );

    await grantXp({ characterId, grantedById: ownerId, amount: 20 });

    const token = await makeToken({
      sub: ownerId,
      email: userEmail,
      name: "Owner",
    });

    // Ability to=2 => cost 4
    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${characterId}/xp/spend`,
      "POST",
      { spends: [{ type: "ability", key: "alertness", from: 1, to: 2 }] },
      { Authorization: `Bearer ${token}` },
    );

    const res = await POST(req as any, {
      params: Promise.resolve({ id: characterId }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.xp.lastSpendCost).toBe(4);
    expect(json.xp.remaining).toBe(16);

    const r = await pool.query<{ spent_experience: number; sheet: any }>(
      `SELECT spent_experience, sheet FROM public.characters WHERE id = $1`,
      [characterId],
    );

    expect(r.rows[0].spent_experience).toBe(4);
    expect(r.rows[0].sheet?.draft?.abilities?.alertness).toBe(2);

    const ledger = await pool.query<{ spent: number }>(
      `SELECT COALESCE(SUM(xp_cost),0)::int as spent FROM public.xp_spend_logs WHERE character_id = $1 AND status='APPROVED'`,
      [characterId],
    );
    expect(ledger.rows[0].spent).toBe(4);
  });
});
