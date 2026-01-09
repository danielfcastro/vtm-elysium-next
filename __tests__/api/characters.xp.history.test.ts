// __tests__/api/characters.xp.history.test.ts
import { makeToken } from "../helpers/makeToken";
import { pool } from "@/lib/db";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
  cleanupTestArtifacts,
  makeRunTag,
  seedCharacter,
  seedTestUser,
} from "../helpers/testDb";

import { GET } from "@/app/api/characters/[id]/xp/history/route";

describe("GET /api/characters/:id/xp/history", () => {
  const runTag = makeRunTag("characters-xp-history");
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

  test("200 retorna grants e spends ordenados", async () => {
    const userId = await seedTestUser(userEmail, true);
    const { characterId, gameId } = await seedCharacter(
      userId,
      "APPROVED",
      runTag,
    );
    created.characterIds.push(characterId);
    created.gameIds.push(gameId);

    // cria um grant e um spend com timestamps distintos
    await pool.query(
      `INSERT INTO public.xp_grants (character_id, granted_by_id, amount, session_date, note, created_at)
       VALUES ($1, $2, 10, CURRENT_DATE, 'grant 1', NOW() - INTERVAL '2 minutes')`,
      [characterId, userId],
    );

    await pool.query(
      `INSERT INTO public.xp_spend_logs
         (character_id, requested_by_id, resolved_by_id, status, xp_cost, payload, created_at, resolved_at)
       VALUES
         ($1, $2, $2, 'APPROVED', 2, '{"kind":"seed"}'::jsonb, NOW() - INTERVAL '1 minutes', NOW() - INTERVAL '1 minutes')`,
      [characterId, userId],
    );

    const token = await makeToken({
      sub: userId,
      email: userEmail,
      name: "Player",
    });
    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${characterId}/xp/history?limit=10&offset=0`,
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await GET(req as any, { params: { id: characterId } });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.characterId).toBe(characterId);
    expect(Array.isArray(json.items)).toBe(true);
    // Espera ao menos 2 itens: um SPEND e um GRANT
    const kinds = json.items.map((x: any) => x.kind);
    expect(kinds).toContain("GRANT");
    expect(kinds).toContain("SPEND");

    // Ordem desc por created_at => SPEND (mais recente) deve vir antes do GRANT
    const first = json.items[0];
    expect(first.kind).toBe("SPEND");
    expect(first.xp_cost).toBe(2);
  });
});
