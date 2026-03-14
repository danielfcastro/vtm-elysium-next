// __tests__/api/characters.xp.get.test.ts
import { SignJWT } from "jose";
import { pool } from "@/lib/db";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
  cleanupTestArtifacts,
  makeRunTag,
  seedCharacter,
  seedTestUser,
} from "../helpers/testDb";

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
import { GET } from "@/app/api/characters/[id]/xp/route";

describe("GET /api/characters/:id/xp", () => {
  const runTag = makeRunTag("characters-xp-get");
  const userEmail = `player+${runTag}@example.com`;

  const created: {
    characterIds: string[];
    gameIds: string[];
    userEmails: string[];
  } = {
    characterIds: [],
    gameIds: [],
    userEmails: [userEmail],
  };

  afterAll(async () => {
    await cleanupTestArtifacts(created);
  });

  test("200 retorna totais de XP via ledger", async () => {
    const userId = await seedTestUser(userEmail, true);

    const { characterId, gameId } = await seedCharacter(
      userId,
      "APPROVED",
      runTag,
    );
    created.characterIds.push(characterId);
    created.gameIds.push(gameId);

    // ledger: 20 XP grant
    await pool.query(
      `INSERT INTO public.xp_grants (character_id, granted_by_id, amount, session_date, note)
       VALUES ($1, $2, 20, CURRENT_DATE, 'seed grant')`,
      [characterId, userId],
    );

    // ledger: 4 XP spend (já aprovado)
    await pool.query(
      `INSERT INTO public.xp_spend_logs
         (character_id, requested_by_id, resolved_by_id, status, xp_cost, payload, resolved_at)
       VALUES
         ($1, $2, $2, 'APPROVED', 4, '{}'::jsonb, NOW())`,
      [characterId, userId],
    );

    // token
    const token = await makeToken({
      sub: userId,
      email: userEmail,
      name: "Player",
    });
    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${characterId}/xp`,
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await GET(req as any, {
      params: Promise.resolve({ id: characterId }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.characterId).toBe(characterId);
    expect(json.totals.granted).toBe(20);
    expect(json.totals.spent).toBe(4);
    expect(json.totals.remaining).toBe(16);
  });
});
