// __tests__/api/characters.get.test.ts
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

jest.mock("jose");

const RUN_TAG = makeRunTag("characters-get");
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

describe("GET /api/characters/:id", () => {
  let ownerUserId: string;
  let characterId: string;

  const createdGameIds: string[] = [];
  const createdCharacterIds: string[] = [];

  beforeAll(async () => {
    await resetUsersTable();

    ownerUserId = await seedTestUser(ST_EMAIL, true);

    const seeded = await seedCharacter(ownerUserId, "DRAFT_PHASE1", RUN_TAG);
    characterId = seeded.characterId;

    createdGameIds.push(seeded.gameId);
    createdCharacterIds.push(seeded.characterId);
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
      `http://localhost/api/characters/${characterId}`,
      "GET",
    );

    const res = await characterGetRoute(req, { params: { id: characterId } });
    expect(res.status).toBe(401);

    const json: any = await res.json();
    expect(json.error).toBeDefined();
  });

  it("deve retornar 404 quando character não existir", async () => {
    const token = await getTokenFor(ST_EMAIL);
    const missingId = "00000000-0000-0000-0000-000000000000";

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${missingId}`,
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await characterGetRoute(req, { params: { id: missingId } });
    expect(res.status).toBe(404);

    const json: any = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("deve retornar 200 e o character quando token for do owner", async () => {
    const token = await getTokenFor(ST_EMAIL);

    const req = makeNextJsonRequest(
      `http://localhost/api/characters/${characterId}`,
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await characterGetRoute(req, {
      params: Promise.resolve({ id: characterId }),
    });

    expect(res.status).toBe(200);

    const json: any = await res.json();
    expect(json.character).toBeDefined();
    expect(json.character.id).toBe(characterId);
    expect(json.character.ownerUserId).toBe(ownerUserId);
    expect(json.character.status).toMatch(/DRAFT_/);
    expect(json.character.sheet).toBeDefined();
    expect(json.character.sheet.phase).toBe(1);
  });
});
