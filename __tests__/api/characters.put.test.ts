import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { PUT } from "@/app/api/characters/[id]/route";
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

describe("PUT /api/characters/:id", () => {
  const runTag = makeRunTag("characters-put");
  const ownerEmail = `put_owner_${runTag}@example.com`;
  const otherEmail = `put_other_${runTag}@example.com`;

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
      "http://localhost/api/characters/x",
      "PUT",
      {
        sheet: { phase: 1, name: "X" },
      },
    );
    const res = await PUT(
      req as any,
      { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
    );
    expect(res.status).toBe(401);
  });

  test("404 quando character não existir", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);
    const token = await makeToken({
      sub: ownerId,
      email: ownerEmail,
      name: "O",
    });

    const req = makeNextJsonRequest(
      "http://localhost/api/characters/00000000-0000-0000-0000-000000000000",
      "PUT",
      { sheet: { phase: 1, name: "DoesNotExist" } },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PUT(
      req as any,
      { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
    );
    expect(res.status).toBe(404);
  });

  test("403 quando token for de outro usuário", async () => {
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
      `http://localhost/api/characters/${seeded.characterId}`,
      "PUT",
      { sheet: { phase: 1, name: "AttemptByOther" } },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PUT(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect(res.status).toBe(403);
  });

  test("409 quando status não é editável (ex: SUBMITTED)", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);

    const seeded = await seedCharacter(ownerId, "SUBMITTED", runTag);
    createdCharacterIds.push(seeded.characterId);
    createdGameIds.push(seeded.gameId);

    const token = await makeToken({
      sub: ownerId,
      email: ownerEmail,
      name: "Owner",
    });

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${seeded.characterId}`,
      "PUT",
      { sheet: { phase: 2, name: "ShouldFail" } },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PUT(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect(res.status).toBe(409);
  });

  test("200 atualiza sheet (substitui) e incrementa version/updated_at", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);

    const seeded = await seedCharacter(ownerId, "DRAFT_PHASE1", runTag);
    createdCharacterIds.push(seeded.characterId);
    createdGameIds.push(seeded.gameId);

    const token = await makeToken({
      sub: ownerId,
      email: ownerEmail,
      name: "Owner",
    });

    const newSheet = {
      phase: 2,
      name: "Updated Via PUT",
      draft: { abilities: { alertness: 2 } },
      runTag,
    };

    // envia várias chaves equivalentes para tolerar variações de implementação
    const body: any = { sheet: newSheet, character: { sheet: newSheet } };

    const before = await pool.query(
      `SELECT version, updated_at FROM public.characters WHERE id=$1`,
      [seeded.characterId],
    );
    const beforeVersion = Number(before.rows[0].version);

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${seeded.characterId}`,
      "PUT",
      body,
      { Authorization: `Bearer ${token}` },
    );

    const res = await PUT(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect(res.status).toBe(200);

    const after = await pool.query(
      `SELECT sheet, version FROM public.characters WHERE id=$1`,
      [seeded.characterId],
    );
    expect(Number(after.rows[0].version)).toBeGreaterThan(beforeVersion);

    const sheet = after.rows[0].sheet;
    expect(sheet?.draft?.abilities?.alertness).toBe(2);
  });
});
