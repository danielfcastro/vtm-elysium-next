import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { PATCH } from "@/app/api/storyteller/characters/[id]/approve/route";
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

describe("PATCH /api/storyteller/characters/:id/approve", () => {
  const runTag = makeRunTag("approve");
  const stEmail = `ap_st_${runTag}@example.com`;
  const playerEmail = `ap_pl_${runTag}@example.com`;

  const createdUserEmails = [stEmail, playerEmail];
  const createdGameIds: string[] = [];
  const createdCharacterIds: string[] = [];

  afterAll(async () => {
    await cleanupTestArtifacts({
      characterIds: createdCharacterIds,
      gameIds: createdGameIds,
      userEmails: createdUserEmails,
    });
  });

  async function createSubmittedCharacter(gameId: string, ownerId: string) {
    const ins = await pool.query<{ id: string }>(
      `INSERT INTO public.characters (
        game_id, owner_user_id, status_id, submitted_at, sheet, total_experience, spent_experience, version, created_at, updated_at
      ) VALUES ($1,$2,3,NOW(),$3::jsonb,0,0,1,NOW(),NOW())
      RETURNING id`,
      [gameId, ownerId, JSON.stringify({ runTag, kind: "submitted" })],
    );
    const characterId = ins.rows[0].id;
    createdCharacterIds.push(characterId);
    return characterId;
  }

  test("401 sem Authorization", async () => {
    const req = makeNextJsonRequest(
      "http://localhost/api/storyteller/characters/x/approve",
      "PATCH",
    );
    const res = await PATCH(
      req as any,
      { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
    );
    expect(res.status).toBe(401);
  });

  test("403 quando não é storyteller do game", async () => {
    const stId = await seedTestUser(stEmail, true);
    const ownerId = await seedTestUser(playerEmail, true);

    const gameId = await ensureTestGameForUser(stId, `ApproveGame-${runTag}`);
    createdGameIds.push(gameId);

    // deixa como PLAYER para forçar 403
    await pool.query(
      `INSERT INTO public.user_game_roles (user_id, game_id, role)
       VALUES ($1,$2,'PLAYER')
       ON CONFLICT (user_id, game_id) DO UPDATE SET role=EXCLUDED.role`,
      [stId, gameId],
    );

    const characterId = await createSubmittedCharacter(gameId, ownerId);

    const token = await makeToken({ sub: stId, email: stEmail, name: "User" });

    const req = makeNextJsonRequest(
      `http://localhost/api/storyteller/characters/${characterId}/approve`,
      "PATCH",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await PATCH(req as any, { params: { id: characterId } } as any);
    expect(res.status).toBe(403);
  });

  test("409 quando status != SUBMITTED", async () => {
    const stId = await seedTestUser(stEmail, true);
    const ownerId = await seedTestUser(playerEmail, true);

    const gameId = await ensureTestGameForUser(stId, `ApproveGame2-${runTag}`);
    createdGameIds.push(gameId);

    await pool.query(
      `INSERT INTO public.user_game_roles (user_id, game_id, role)
       VALUES ($1,$2,'STORYTELLER')
       ON CONFLICT (user_id, game_id) DO UPDATE SET role=EXCLUDED.role`,
      [stId, gameId],
    );

    const ins = await pool.query<{ id: string }>(
      `INSERT INTO public.characters (
        game_id, owner_user_id, status_id, sheet, total_experience, spent_experience, version, created_at, updated_at
      ) VALUES ($1,$2,2,$3::jsonb,0,0,1,NOW(),NOW())
      RETURNING id`,
      [gameId, ownerId, JSON.stringify({ runTag, kind: "draft2" })],
    );
    const characterId = ins.rows[0].id;
    createdCharacterIds.push(characterId);

    const token = await makeToken({ sub: stId, email: stEmail, name: "ST" });

    const req = makeNextJsonRequest(
      `http://localhost/api/storyteller/characters/${characterId}/approve`,
      "PATCH",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await PATCH(req as any, { params: { id: characterId } } as any);
    expect(res.status).toBe(409);
  });

  test("200 aprova quando status SUBMITTED", async () => {
    const stId = await seedTestUser(stEmail, true);
    const ownerId = await seedTestUser(playerEmail, true);

    const gameId = await ensureTestGameForUser(stId, `ApproveGame3-${runTag}`);
    createdGameIds.push(gameId);

    await pool.query(
      `INSERT INTO public.user_game_roles (user_id, game_id, role)
       VALUES ($1,$2,'STORYTELLER')
       ON CONFLICT (user_id, game_id) DO UPDATE SET role=EXCLUDED.role`,
      [stId, gameId],
    );

    const characterId = await createSubmittedCharacter(gameId, ownerId);

    const token = await makeToken({ sub: stId, email: stEmail, name: "ST" });

    const req = makeNextJsonRequest(
      `http://localhost/api/storyteller/characters/${characterId}/approve`,
      "PATCH",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await PATCH(req as any, { params: { id: characterId } } as any);
    expect(res.status).toBe(200);

    const json: any = await res.json();
    expect(json.character?.status).toBe("APPROVED");
    expect(json.character?.approvedAt).toBeTruthy();
    expect(json.character?.approvedByUserId).toBe(stId);

    const r = await pool.query(
      `SELECT cs.type as status, c.approved_at, c.approved_by_user_id FROM public.characters c LEFT JOIN public.character_status cs ON cs.id = c.status_id WHERE c.id=$1`,
      [characterId],
    );
    expect(r.rows[0].status).toBe("APPROVED");
    expect(r.rows[0].approved_at).toBeTruthy();
    expect(r.rows[0].approved_by_user_id).toBe(stId);
  });
});
