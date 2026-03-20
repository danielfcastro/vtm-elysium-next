// __tests__/api/storyteller.characters.xp.grant.test.ts
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
import { POST } from "@/app/api/storyteller/characters/[id]/xp/grant/route";

describe("POST /api/storyteller/characters/:id/xp/grant", () => {
  const runTag = makeRunTag("st-xp-grant");
  const stEmail = `st+${runTag}@example.com`;
  const playerEmail = `player+${runTag}@example.com`;

  const created: {
    characterIds: string[];
    gameIds: string[];
    userEmails: string[];
  } = {
    characterIds: [],
    gameIds: [],
    userEmails: [stEmail, playerEmail],
  };

  afterAll(async () => {
    await cleanupTestArtifacts(created);
  });

  test("201 cria xp_grant e atualiza cache do character", async () => {
    const stId = await seedTestUser(stEmail, true);
    const playerId = await seedTestUser(playerEmail, true);

    // seed character do player, mas o game é criado com storyteller_id = playerId pelo helper.
    // Então ajustamos: criar game com storyteller_id = stId e mover character para esse game.
    const { characterId, gameId } = await seedCharacter(
      playerId,
      "APPROVED",
      runTag,
    );
    created.characterIds.push(characterId);
    created.gameIds.push(gameId);

    // Reatribui o game.storyteller_id para stId (para ficar coerente com Storyteller)
    await pool.query(
      `UPDATE public.games SET storyteller_id = $1 WHERE id = $2`,
      [stId, gameId],
    );

    // Garante role no user_game_roles para passar requireRoleInGame
    await pool.query(
      `INSERT INTO public.user_game_roles (user_id, game_id, role_id)
       VALUES ($1, $2, 1)
       ON CONFLICT DO NOTHING`,
      [stId, gameId],
    );

    const token = await makeToken({ sub: stId, email: stEmail, name: "ST" });
    const req = makeNextJsonRequest(
      `http://localhost/api/storyteller/characters/${characterId}/xp/grant`,
      "POST",
      { amount: 7, note: "Session XP", sessionDate: "2025-12-31" },
      { Authorization: `Bearer ${token}` },
    );

    const res = await POST(req as any, {
      params: Promise.resolve({ id: characterId }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();

    expect(json.characterId).toBe(characterId);
    expect(json.totals.granted).toBe(7);
    expect(json.totals.spent).toBe(0);
    expect(json.totals.remaining).toBe(7);

    // Confirma grant no ledger
    const g = await pool.query(
      `SELECT amount, granted_by_id FROM public.xp_grants WHERE character_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [characterId],
    );
    expect(g.rows[0].amount).toBe(7);
    expect(g.rows[0].granted_by_id).toBe(stId);

    // Confirma cache em characters
    const c = await pool.query(
      `SELECT total_experience, spent_experience FROM public.characters WHERE id = $1`,
      [characterId],
    );
    expect(Number(c.rows[0].total_experience)).toBe(7);
    expect(Number(c.rows[0].spent_experience)).toBe(0);
  });
});
