import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { GET } from "@/app/api/characters/[id]/audit/route";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
  cleanupTestArtifacts,
  makeRunTag,
  seedTestUser,
  seedCharacter,
  ensureTestGameForUser,
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
    await pool.end();
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
      `INSERT INTO public.user_game_roles (user_id, game_id, role)
       VALUES ($1,$2,'STORYTELLER')
       ON CONFLICT (user_id, game_id) DO UPDATE SET role=EXCLUDED.role`,
      [stId, gameId],
    );

    // cria character nesse game para owner
    const ins = await pool.query<{ id: string }>(
      `INSERT INTO public.characters (
        game_id, owner_user_id, status, sheet, total_experience, spent_experience, version, created_at, updated_at
      ) VALUES ($1,$2,'DRAFT_PHASE1',$3::jsonb,0,0,1,NOW(),NOW())
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
