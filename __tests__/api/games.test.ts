// __tests__/api/games.test.ts
import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { GET as GET_GAMES, POST as POST_GAMES } from "@/app/api/games/route";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
  cleanupTestArtifacts,
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

describe("GET/POST /api/games", () => {
  const runTag = makeRunTag("games");
  const userEmail = `games_user_${runTag}@example.com`;

  const createdUserEmails = [userEmail];
  const createdGameIds: string[] = [];

  afterAll(async () => {
    await cleanupTestArtifacts({
      gameIds: createdGameIds,
      userEmails: createdUserEmails,
    });
    await pool.end();
  });

  test("GET 401 sem Authorization", async () => {
    const req = makeNextJsonRequest("http://localhost/api/games", "GET");
    const res = await GET_GAMES(req as any);
    expect(res.status).toBe(401);
  });

  test("POST 201 cria game e adiciona STORYTELLER em user_game_roles; GET lista o game", async () => {
    const userId = await seedTestUser(userEmail, true);
    const token = await makeToken({
      sub: userId,
      email: userEmail,
      name: "User",
    });

    const postReq = makeNextJsonRequest(
      "http://localhost/api/games",
      "POST",
      { name: `My Game ${runTag}`, description: "desc" },
      { Authorization: `Bearer ${token}` },
    );

    const postRes = await POST_GAMES(postReq as any);
    expect(postRes.status).toBe(201);

    const postJson: any = await postRes.json();
    expect(postJson.game?.id).toBeDefined();
    createdGameIds.push(postJson.game.id);

    // Confere user_game_roles
    const role = await pool.query(
      `SELECT r.name as role FROM public.user_game_roles ugr 
       JOIN public.roles r ON ugr.role_id = r.id 
       WHERE ugr.user_id=$1 AND ugr.game_id=$2`,
      [userId, postJson.game.id],
    );
    expect(role.rowCount).toBe(1);
    expect(role.rows[0].role).toBe("STORYTELLER");

    // GET /api/games deve listar
    const getReq = makeNextJsonRequest(
      "http://localhost/api/games",
      "GET",
      undefined,
      {
        Authorization: `Bearer ${token}`,
      },
    );

    const getRes = await GET_GAMES(getReq as any);
    expect(getRes.status).toBe(200);

    const getJson: any = await getRes.json();
    expect(Array.isArray(getJson.games)).toBe(true);
    expect(getJson.games.some((g: any) => g.id === postJson.game.id)).toBe(
      true,
    );
  });
});
