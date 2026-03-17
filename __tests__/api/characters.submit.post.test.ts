import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { POST } from "@/app/api/characters/[id]/submit/route";
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

describe("POST /api/characters/:id/submit", () => {
  const runTag = makeRunTag("submit");
  const ownerEmail = `sub_owner_${runTag}@example.com`;
  const otherEmail = `sub_other_${runTag}@example.com`;

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
      "http://localhost/api/characters/x/submit",
      "POST",
    );
    const res = await POST(
      req as any,
      { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
    );
    expect(res.status).toBe(401);
  });

  test("403 quando token é de outro usuário", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);
    const otherId = await seedTestUser(otherEmail, true);

    const seeded = await seedCharacter(ownerId, "DRAFT_PHASE2", runTag);
    createdCharacterIds.push(seeded.characterId);
    createdGameIds.push(seeded.gameId);

    const token = await makeToken({
      sub: otherId,
      email: otherEmail,
      name: "Other",
    });

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${seeded.characterId}/submit`,
      "POST",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await POST(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect(res.status).toBe(403);
  });

  test("200 quando status DRAFT_PHASE1: permite submit diretamente", async () => {
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
      `http://localhost/api/characters/${seeded.characterId}/submit`,
      "POST",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await POST(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect(res.status).toBe(200);
  });

  test("200 quando status DRAFT_PHASE2: muda para SUBMITTED e seta submitted_at", async () => {
    const ownerId = await seedTestUser(ownerEmail, true);

    const seeded = await seedCharacter(ownerId, "DRAFT_PHASE2", runTag);
    createdCharacterIds.push(seeded.characterId);
    createdGameIds.push(seeded.gameId);

    const token = await makeToken({
      sub: ownerId,
      email: ownerEmail,
      name: "Owner",
    });

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${seeded.characterId}/submit`,
      "POST",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await POST(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect(res.status).toBe(200);

    const json: any = await res.json();
    expect(json.character?.status).toBe("SUBMITTED");
    expect(json.character?.submittedAt).toBeTruthy();

    const r = await pool.query(
      `SELECT cs.type as status, c.submitted_at FROM public.characters c LEFT JOIN public.character_status cs ON cs.id = c.status_id WHERE c.id=$1`,
      [seeded.characterId],
    );
    expect(r.rows[0].status).toBe("SUBMITTED");
    expect(r.rows[0].submitted_at).toBeTruthy();
  });
});
