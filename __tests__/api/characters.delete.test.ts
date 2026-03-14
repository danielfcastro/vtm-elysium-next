// __tests__/api/characters.delete.test.ts
import { DELETE as characterDeleteRoute } from "@/app/api/characters/[id]/route";
import { GET as characterGetRoute } from "@/app/api/characters/[id]/route";
import { POST as loginRoute } from "@/app/api/login/route";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
  resetUsersTable,
  makeRunTag,
  seedTestUser,
  TEST_PASSWORD,
  seedCharacter,
  cleanupTestArtifacts,
} from "../helpers/testDb";
import { pool } from "@/lib/db";
import { SignJWT } from "jose";

jest.mock("jose");

const RUN_TAG = makeRunTag("characters-delete");
const ST_EMAIL = `st+${RUN_TAG}@example.com`;

async function getTokenFor(email: string) {
  const req = makeNextJsonRequest("http://localhost/api/login", "POST", {
    email,
    password: TEST_PASSWORD,
  });

  const res = await loginRoute(req);
  if (res.status !== 200) {
    throw new Error(`Login de teste falhou com status ${res.status}`);
  }

  const json: any = await res.json();
  return json.token as string;
}

describe("DELETE /api/characters/:id", () => {
  let ownerUserId: string;
  let draftCharacterId: string;
  let nonDraftCharacterId: string;

  const createdGameIds: string[] = [];
  const createdCharacterIds: string[] = [];

  beforeAll(async () => {
    await resetUsersTable();

    ownerUserId = await seedTestUser(ST_EMAIL, true);

    const draft = await seedCharacter(ownerUserId, "DRAFT_PHASE1", RUN_TAG);
    draftCharacterId = draft.characterId;
    createdGameIds.push(draft.gameId);
    createdCharacterIds.push(draft.characterId);

    const nonDraft = await seedCharacter(ownerUserId, "SUBMITTED", RUN_TAG);
    nonDraftCharacterId = nonDraft.characterId;
    createdGameIds.push(nonDraft.gameId);
    createdCharacterIds.push(nonDraft.characterId);
  });

  afterAll(async () => {
    await cleanupTestArtifacts({
      characterIds: createdCharacterIds,
      gameIds: createdGameIds,
      userEmails: [ST_EMAIL],
    });

    await pool.end();
  });

  it("deve retornar 401 sem Authorization header", async () => {
    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${draftCharacterId}`,
      "DELETE",
    );

    const res = await characterDeleteRoute(req, {
      params: { id: draftCharacterId },
    });
    expect(res.status).toBe(401);
  });

  it("deve retornar 404 quando character não existir", async () => {
    const token = await getTokenFor(ST_EMAIL);
    const missingId = "00000000-0000-0000-0000-000000000000";

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${missingId}`,
      "DELETE",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await characterDeleteRoute(req, { params: { id: missingId } });
    expect(res.status).toBe(404);
  });

  it("deve retornar 403 quando token for de outro usuário", async () => {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "dev-secret-change-me",
    );
    const otherUserId = "11111111-1111-1111-1111-111111111111";

    const token = await new SignJWT({
      sub: otherUserId,
      email: "other@example.com",
      name: "Other",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("1d")
      .sign(secret);

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${draftCharacterId}`,
      "DELETE",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await characterDeleteRoute(req, {
      params: { id: draftCharacterId },
    });
    expect(res.status).toBe(403);
  });

  it("deve retornar 409 quando status não for deletável", async () => {
    const token = await getTokenFor(ST_EMAIL);

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${nonDraftCharacterId}`,
      "DELETE",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await characterDeleteRoute(req, {
      params: { id: nonDraftCharacterId },
    });
    expect(res.status).toBe(409);
  });

  it("deve retornar 200 e marcar deleted_at quando deletar draft", async () => {
    const token = await getTokenFor(ST_EMAIL);

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${draftCharacterId}`,
      "DELETE",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await characterDeleteRoute(req, {
      params: Promise.resolve({ id: draftCharacterId }),
    });

    expect(res.status).toBe(200);

    const json: any = await res.json();
    expect(json.ok).toBe(true);

    const r = await pool.query(
      `SELECT deleted_at FROM public.characters WHERE id = $1 LIMIT 1`,
      [draftCharacterId],
    );

    expect(r.rowCount).toBe(1);
    expect(r.rows[0].deleted_at).toBeTruthy();

    const reqGet = makeNextJsonRequest(
      `http://localhost/api/characters/${draftCharacterId}`,
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const resGet = await characterGetRoute(reqGet, {
      params: { id: draftCharacterId },
    });
    expect(resGet.status).toBe(404);
  });
});
