import { pool } from "@/lib/db";
import { makeToken } from "../helpers/makeToken";
import { GET, POST } from "@/app/api/characters/[id]/audit/route";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
  cleanupTestArtifacts,
  makeRunTag,
  seedTestUser,
  seedCharacter,
  ensureTestGameForUser,
} from "../helpers/testDb";

describe("GET /api/characters/:id/audit", () => {
  const runTag = makeRunTag("audit");
  const ownerEmail = `audit_owner_${runTag}@example.com`;
  const otherEmail = `audit_other_${runTag}@example.com`;
  const stEmail = `audit_st_${runTag}@example.com`;

  const createdUserEmails = [ownerEmail, otherEmail, stEmail];
  const createdGameIds: string[] = [];
  const createdCharacterIds: string[] = [];

  afterAll(async () => {
    await cleanupTestArtifacts({
      characterIds: createdCharacterIds,
      gameIds: createdGameIds,
      userEmails: createdUserEmails,
    });
    //await pool.end();
  });

  test("401 sem Authorization", async () => {
    const req = makeNextJsonRequest(
      "http://localhost/api/characters/x/audit",
      "GET",
    );
    const res = await GET(
      req as any,
      { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
    );
    expect(res.status).toBe(401);
  });

  test("404 quando character não existe", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);
    const token = await makeToken({
      sub: ownerId,
      email: ownerEmail,
      name: "Owner",
    });

    const req = makeNextJsonRequest(
      "http://localhost/api/characters/00000000-0000-0000-0000-000000000000/audit",
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await GET(
      req as any,
      { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
    );
    expect(res.status).toBe(404);
  });

  test("403 quando não é owner nem storyteller/admin", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);
    const otherId = await seedTestUser(otherEmail, true);

    const seeded = await seedCharacter(ownerId, "DRAFT_PHASE1", runTag);
    createdCharacterIds.push(seeded.characterId);
    createdGameIds.push(seeded.gameId);

    const token = await makeToken({
      sub: otherId,
      email: otherEmail,
      name: "Other",
    });

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${seeded.characterId}/audit`,
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await GET(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect(res.status).toBe(403);
  });

  test("200 quando owner acessa", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);

    const seeded = await seedCharacter(ownerId, "DRAFT_PHASE1", runTag);
    createdCharacterIds.push(seeded.characterId);
    createdGameIds.push(seeded.gameId);

    const token = await makeToken({
      sub: ownerId,
      email: ownerEmail,
      name: "Owner",
    });

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${seeded.characterId}/audit?limit=50&offset=0`,
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await GET(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect(res.status).toBe(200);

    const json: any = await res.json();
    expect(json.characterId).toBe(seeded.characterId);
    expect(Array.isArray(json.items)).toBe(true);
  });

  test("200 quando storyteller/admin do game acessa", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);
    const stId = await seedTestUser(stEmail, true);

    // cria game pelo storyteller e adiciona role ST
    const gameId = await ensureTestGameForUser(stId, `AuditGame-${runTag}`);
    createdGameIds.push(gameId);

    await pool.query(
      `INSERT INTO public.user_game_roles (user_id, game_id, role_id)
       VALUES ($1,$2,1)
       ON CONFLICT (user_id, game_id) DO UPDATE SET role_id=EXCLUDED.role_id`,
      [stId, gameId],
    );

    // cria character nesse game para owner
    const ins = await pool.query<{ id: string }>(
      `INSERT INTO public.characters (
        game_id, owner_user_id, status_id, sheet, total_experience, spent_experience, version, created_at, updated_at
      ) VALUES ($1,$2,1,$3::jsonb,0,0,1,NOW(),NOW())
      RETURNING id`,
      [gameId, ownerId, JSON.stringify({ phase: 1, runTag })],
    );

    const characterId = ins.rows[0].id;
    createdCharacterIds.push(characterId);

    const token = await makeToken({ sub: stId, email: stEmail, name: "ST" });

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${characterId}/audit`,
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await GET(req as any, { params: { id: characterId } } as any);
    expect(res.status).toBe(200);

    const json: any = await res.json();
    expect(json.characterId).toBe(characterId);
    expect(Array.isArray(json.items)).toBe(true);
  });
});

describe("POST /api/characters/:id/audit", () => {
  const runTag = makeRunTag("audit_post");

  const ownerEmail = `audit_post_owner_${runTag}@example.com`;
  const createdUserEmails = [ownerEmail];
  const createdGameIds: string[] = [];
  const createdCharacterIds: string[] = [];

  afterAll(async () => {
    await cleanupTestArtifacts({
      characterIds: createdCharacterIds,
      gameIds: createdGameIds,
      userEmails: createdUserEmails,
    });
  });

  it("deve retornar 401 sem Authorization header", async () => {
    const url =
      "http://localhost/api/characters/00000000-0000-0000-0000-000000000000/audit";

    const req = makeNextJsonRequest(url, "POST", {
      actionType: "TEST",
      payload: { message: "unauthorized" },
    });

    const res = await POST(
      req as any,
      {
        params: { id: "00000000-0000-0000-0000-000000000000" },
      } as any,
    );

    expect(res.status).toBe(401);
  });

  it("deve retornar 201 e registrar um audit log quando o owner enviar", async () => {
    // 1) seed user
    const ownerId = await seedTestUser(ownerEmail, true);

    // 2) seed character de teste
    const { gameId, characterId } = await seedCharacter(
      ownerId,
      "DRAFT_PHASE1",
      runTag,
    );

    createdGameIds.push(gameId);
    createdCharacterIds.push(characterId);

    // 3) token para o owner
    const token = await makeToken({
      sub: ownerId,
      email: ownerEmail,
      name: "Audit Post Owner",
    });

    const url = `http://localhost/api/characters/${characterId}/audit`;

    const req = makeNextJsonRequest(
      url,
      "POST",
      {
        actionType: "FREEBIE_SPENT",
        payload: {
          message: "Spent 1 freebie on Willpower",
        },
      },
      {
        Authorization: `Bearer ${token}`,
      },
    );

    const res = await POST(
      req as any,
      {
        params: { id: characterId },
      } as any,
    );

    expect(res.status).toBe(201);

    const json: any = await res.json();

    expect(json).toHaveProperty("id");
    expect(json.character_id).toBe(characterId);
    expect(json.user_id).toBe(ownerId);
    expect(json.action_type_id).toBe(2);
    // payload volta como objeto JSON
    expect(json.payload).toMatchObject({
      message: "Spent 1 freebie on Willpower",
    });
  });
});
