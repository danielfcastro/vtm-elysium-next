// __tests__/api/storyteller.games.get.test.ts
import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { GET } from "@/app/api/storyteller/games/route";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
  cleanupTestArtifacts,
  ensureTestGameForUser,
  makeRunTag,
  seedTestUser,
} from "../helpers/testDb";

function secretKey() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
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

describe("GET /api/storyteller/games", () => {
  const runTag = makeRunTag("st-games");
  const stEmail = `st_games_${runTag}@example.com`;

  const createdUserEmails = [stEmail];
  const createdGameIds: string[] = [];

  afterAll(async () => {
    await cleanupTestArtifacts({
      gameIds: createdGameIds,
      userEmails: createdUserEmails,
    });
  });

  test("401 sem Authorization (requireAuth lança erro)", async () => {
    const req = makeNextJsonRequest(
      "http://localhost/api/storyteller/games",
      "GET",
    );
    await expect(GET(req as any)).rejects.toMatchObject({
      message: "Invalid or missing token",
      status: 401,
    });
  });

  test("200 lista apenas jogos onde role=STORYTELLER em user_game_roles", async () => {
    const stId = await seedTestUser(stEmail, true);
    const token = await makeToken({ sub: stId, email: stEmail, name: "ST" });

    const game1 = await ensureTestGameForUser(stId, `STGame1-${runTag}`);
    const game2 = await ensureTestGameForUser(stId, `STGame2-${runTag}`);
    createdGameIds.push(game1, game2);

    // game1: storyteller
    await pool.query(
      `INSERT INTO public.user_game_roles (user_id, game_id, role_id)
         VALUES ($1,$2,1)
           ON CONFLICT (user_id, game_id) DO UPDATE SET role_id=EXCLUDED.role_id`,
      [stId, game1],
    );

    // game2: player (não deve aparecer)
    await pool.query(
      `INSERT INTO public.user_game_roles (user_id, game_id, role_id)
         VALUES ($1,$2,2)
           ON CONFLICT (user_id, game_id) DO UPDATE SET role_id=EXCLUDED.role_id`,
      [stId, game2],
    );

    const req = makeNextJsonRequest(
      "http://localhost/api/storyteller/games",
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json: any = await res.json();
    expect(Array.isArray(json.games)).toBe(true);

    const ids = json.games.map((g: any) => g.id);
    expect(ids).toContain(game1);
    expect(ids).not.toContain(game2);
  });
});
