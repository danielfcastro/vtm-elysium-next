// __tests__/api/storyteller.game.characters.get.test.ts
import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { GET } from "@/app/api/storyteller/games/[gameId]/characters/route";
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

describe("GET /api/storyteller/games/:gameId/characters", () => {
  const runTag = makeRunTag("st-game-ch");
  const stEmail = `st_gc_${runTag}@example.com`;
  const owner1Email = `owner1_gc_${runTag}@example.com`;
  const owner2Email = `owner2_gc_${runTag}@example.com`;

  const createdUserEmails = [stEmail, owner1Email, owner2Email];
  const createdGameIds: string[] = [];
  const createdCharacterIds: string[] = [];

  afterAll(async () => {
    await cleanupTestArtifacts({
      characterIds: createdCharacterIds,
      gameIds: createdGameIds,
      userEmails: createdUserEmails,
    });
  });

  test("403 quando usuário não é storyteller no game", async () => {
    const stId = await seedTestUser(stEmail, true);
    const owner1Id = await seedTestUser(owner1Email, true);

    const gameId = await ensureTestGameForUser(stId, `Game-${runTag}`);
    createdGameIds.push(gameId);

    // role PLAYER (não storyteller)
    await pool.query(
        `INSERT INTO public.user_game_roles (user_id, game_id, role)
         VALUES ($1,$2,'PLAYER')
         ON CONFLICT (user_id, game_id) DO UPDATE SET role=EXCLUDED.role`,
        [stId, gameId],
    );

    const c = await pool.query<{ id: string }>(
        `INSERT INTO public.characters (game_id, owner_user_id, status, sheet, total_experience, spent_experience, version, created_at, updated_at)
         VALUES ($1,$2,'DRAFT_PHASE1',$3::jsonb,0,0,1,NOW(),NOW())
         RETURNING id`,
        [gameId, owner1Id, JSON.stringify({ phase: 1, runTag })],
    );
    createdCharacterIds.push(c.rows[0].id);

    const token = await makeToken({ sub: stId, email: stEmail, name: "ST" });

    const req = makeNextJsonRequest(
        `http://localhost/api/storyteller/games/${gameId}/characters`,
        "GET",
        undefined,
        { Authorization: `Bearer ${token}` },
    );

    const res = await GET(
        req as any,
        { params: Promise.resolve({ gameId }) } as any,
    );
    expect(res.status).toBe(403);
  });

  test("200 retorna personagens e suporta filtro status", async () => {
    const stId = await seedTestUser(stEmail, true);
    const owner1Id = await seedTestUser(owner1Email, true);
    const owner2Id = await seedTestUser(owner2Email, true);

    const gameId = await ensureTestGameForUser(stId, `Game2-${runTag}`);
    createdGameIds.push(gameId);

    // role STORYTELLER
    await pool.query(
        `INSERT INTO public.user_game_roles (user_id, game_id, role)
         VALUES ($1,$2,'STORYTELLER')
         ON CONFLICT (user_id, game_id) DO UPDATE SET role=EXCLUDED.role`,
        [stId, gameId],
    );

    // char1 DRAFT_PHASE1 (owner1)
    const c1 = await pool.query<{ id: string }>(
        `INSERT INTO public.characters (game_id, owner_user_id, status, sheet, total_experience, spent_experience, version, created_at, updated_at)
         VALUES ($1,$2,'DRAFT_PHASE1',$3::jsonb,0,0,1,NOW(),NOW())
         RETURNING id`,
        [gameId, owner1Id, JSON.stringify({ phase: 1, name: "c1", runTag })],
    );
    createdCharacterIds.push(c1.rows[0].id);

    // char2 SUBMITTED (owner2) — evita uq_characters_game_owner_active
    const c2 = await pool.query<{ id: string }>(
        `INSERT INTO public.characters (game_id, owner_user_id, status, submitted_at, sheet, total_experience, spent_experience, version, created_at, updated_at)
         VALUES ($1,$2,'SUBMITTED',NOW(),$3::jsonb,0,0,1,NOW(),NOW())
         RETURNING id`,
        [gameId, owner2Id, JSON.stringify({ phase: 2, name: "c2", runTag })],
    );
    createdCharacterIds.push(c2.rows[0].id);

    const token = await makeToken({ sub: stId, email: stEmail, name: "ST" });

    // sem filtro
    const reqAll = makeNextJsonRequest(
        `http://localhost/api/storyteller/games/${gameId}/characters`,
        "GET",
        undefined,
        { Authorization: `Bearer ${token}` },
    );
    const resAll = await GET(
        reqAll as any,
        { params: Promise.resolve({ gameId }) } as any,
    );
    expect(resAll.status).toBe(200);

    const allJson: any = await resAll.json();
    expect(Array.isArray(allJson.characters)).toBe(true);
    const allIds = allJson.characters.map((c: any) => c.id);
    expect(allIds).toContain(c1.rows[0].id);
    expect(allIds).toContain(c2.rows[0].id);

    // filtro status=SUBMITTED
    const reqSubmitted = makeNextJsonRequest(
        `http://localhost/api/storyteller/games/${gameId}/characters?status=SUBMITTED`,
        "GET",
        undefined,
        { Authorization: `Bearer ${token}` },
    );
    const resSubmitted = await GET(
        reqSubmitted as any,
        {
          params: Promise.resolve({ gameId }),
        } as any,
    );
    expect(resSubmitted.status).toBe(200);

    const subJson: any = await resSubmitted.json();
    const subIds = subJson.characters.map((c: any) => c.id);
    expect(subIds).toContain(c2.rows[0].id);
    expect(subIds).not.toContain(c1.rows[0].id);
  });
});