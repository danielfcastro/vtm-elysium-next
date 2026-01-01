import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { PATCH } from "@/app/api/characters/[id]/sheet-merge/route";
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

describe("PATCH /api/characters/:id/sheet-merge", () => {
  const runTag = makeRunTag("sheet-merge");
  const ownerEmail = `sm_owner_${runTag}@example.com`;
  const otherEmail = `sm_other_${runTag}@example.com`;

  const createdUserEmails = [ownerEmail, otherEmail];
  const createdGameIds: string[] = [];
  const createdCharacterIds: string[] = [];

  afterAll(async () => {
    await cleanupTestArtifacts({
      characterIds: createdCharacterIds,
      gameIds: createdGameIds,
      userEmails: createdUserEmails,
    });
  });

  test("401 sem Authorization", async () => {
    const req = makeNextJsonRequest(
      "http://localhost/api/characters/x/sheet-merge",
      "PATCH",
      { patch: { draft: { name: "X" } } },
    );
    const res = await PATCH(
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
      "http://localhost/api/characters/00000000-0000-0000-0000-000000000000/sheet-merge",
      "PATCH",
      { patch: { draft: { name: "X" } } },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PATCH(
      req as any,
      { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
    );
    expect(res.status).toBe(404);
  });

  test("403 quando token é de outro usuário", async () => {
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
      `http://localhost/api/characters/${seeded.characterId}/sheet-merge`,
      "PATCH",
      { patch: { draft: { name: "Hacked" } } },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PATCH(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect(res.status).toBe(403);
  });

  test("409 quando status não é editável (ex: APPROVED)", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);

    const seeded = await seedCharacter(ownerId, "APPROVED", runTag);
    createdCharacterIds.push(seeded.characterId);
    createdGameIds.push(seeded.gameId);

    const token = await makeToken({
      sub: ownerId,
      email: ownerEmail,
      name: "Owner",
    });

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${seeded.characterId}/sheet-merge`,
      "PATCH",
      { patch: { draft: { name: "ShouldFail" } } },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PATCH(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect(res.status).toBe(409);
  });

  test("200 merge aplica patch no JSONB", async () => {
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
      `http://localhost/api/characters/${seeded.characterId}/sheet-merge`,
      "PATCH",
      { patch: { draft: { abilities: { alertness: 2 } } } },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PATCH(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect(res.status).toBe(200);

    const json: any = await res.json();
    expect(json.character?.id).toBe(seeded.characterId);
    expect(json.character?.sheet?.draft?.abilities?.alertness).toBe(2);

    const r = await pool.query(
      `SELECT sheet FROM public.characters WHERE id=$1`,
      [seeded.characterId],
    );
    expect(r.rows[0].sheet?.draft?.abilities?.alertness).toBe(2);
  });
});
