// __tests__/api/characters.history.get.test.ts
import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { GET } from "@/app/api/characters/[id]/history/route";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
  cleanupTestArtifacts,
  makeRunTag,
  seedTestUser,
  seedCharacter,
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

describe("GET /api/characters/:id/history", () => {
  const runTag = makeRunTag("ch-history");
  const ownerEmail = `hist_owner_${runTag}@example.com`;

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

  test("401 sem Authorization (requireAuth lança erro)", async () => {
    const req = makeNextJsonRequest(
      "http://localhost/api/characters/x/history",
      "GET",
    );
    await expect(
      GET(
        req as any,
        { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
      ),
    ).rejects.toMatchObject({
      message: "Invalid or missing token",
      status: 401,
    });
  });

  test("404 quando character não existe", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);
    const token = await makeToken({
      sub: ownerId,
      email: ownerEmail,
      name: "Owner",
    });

    const req = makeNextJsonRequest(
      "http://localhost/api/characters/00000000-0000-0000-0000-000000000000/history",
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await GET(
      req as any,
      {
        params: { id: "00000000-0000-0000-0000-000000000000" },
      } as any,
    );
    expect(res.status).toBe(404);
  });

  test("200 retorna itens após updates (trigger populou characters_history)", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);
    const token = await makeToken({
      sub: ownerId,
      email: ownerEmail,
      name: "Owner",
    });

    const seeded = await seedCharacter(ownerId, "DRAFT_PHASE1", runTag);
    createdCharacterIds.push(seeded.characterId);
    createdGameIds.push(seeded.gameId);

    // UPDATE para disparar trigger BEFORE UPDATE e gravar OLD em characters_history
    await pool.query(
      `UPDATE public.characters
         SET status_id = 2, sheet = sheet || $2::jsonb, updated_at = now(), version = version + 1
         WHERE id = $1`,
      [seeded.characterId, JSON.stringify({ phase: 2, updatedByTest: true })],
    );

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${seeded.characterId}/history?limit=50&offset=0`,
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
    expect(json.items.length).toBeGreaterThanOrEqual(1);

    // deve existir id do history (history_id)
    expect(json.items[0].id).toBeDefined();
  });
});
