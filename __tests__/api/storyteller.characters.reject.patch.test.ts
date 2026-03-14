import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { PATCH } from "@/app/api/storyteller/characters/[id]/reject/route";
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

describe("PATCH /api/storyteller/characters/:id/reject", () => {
  const runTag = makeRunTag("reject");
  const stEmail = `rej_st_${runTag}@example.com`;
  const playerEmail = `rej_pl_${runTag}@example.com`;

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
      "http://localhost/api/storyteller/characters/x/reject",
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

    const gameId = await ensureTestGameForUser(stId, `RejectGame-${runTag}`);
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
      `http://localhost/api/storyteller/characters/${characterId}/reject`,
      "PATCH",
      { reason: "Nope" },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PATCH(req as any, { params: { id: characterId } } as any);
    expect(res.status).toBe(403);
  });

  test("409 quando status != SUBMITTED", async () => {
    const stId = await seedTestUser(stEmail, true);
    const ownerId = await seedTestUser(playerEmail, true);

    const gameId = await ensureTestGameForUser(stId, `RejectGame2-${runTag}`);
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
      `http://localhost/api/storyteller/characters/${characterId}/reject`,
      "PATCH",
      { reason: "Invalid" },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PATCH(req as any, { params: { id: characterId } } as any);
    expect(res.status).toBe(409);
  });

  test("200 rejeita quando status SUBMITTED e salva reason", async () => {
    const stId = await seedTestUser(stEmail, true);
    const ownerId = await seedTestUser(playerEmail, true);

    const gameId = await ensureTestGameForUser(stId, `RejectGame3-${runTag}`);
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
      `http://localhost/api/storyteller/characters/${characterId}/reject`,
      "PATCH",
      { reason: "Missing details" },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PATCH(req as any, { params: { id: characterId } } as any);
    expect(res.status).toBe(200);

    const json: any = await res.json();
    expect(json.character?.status).toBe("REJECTED");
    expect(json.character?.rejectedAt).toBeTruthy();
    expect(json.character?.rejectedByUserId).toBe(stId);
    expect(json.character?.rejectionReason).toBe("Missing details");

    const r = await pool.query(
      `SELECT cs.type as status, c.rejected_at, c.rejected_by_user_id, c.rejection_reason FROM public.characters c LEFT JOIN public.character_status cs ON cs.id = c.status_id WHERE c.id=$1`,
      [characterId],
    );
    expect(r.rows[0].status).toBe("REJECTED");
    expect(r.rows[0].rejected_at).toBeTruthy();
    expect(r.rows[0].rejected_by_user_id).toBe(stId);
    expect(r.rows[0].rejection_reason).toBe("Missing details");
  });
});
