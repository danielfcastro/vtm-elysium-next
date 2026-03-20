import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { POST } from "@/app/api/storyteller/characters/[id]/revert/route";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
  cleanupTestArtifacts,
  makeRunTag,
  seedCharacter,
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

describe("POST /api/storyteller/characters/:id/revert", () => {
  const runTag = makeRunTag("st-revert");
  const stEmail = `st_revert_${runTag}@example.com`;
  const ownerEmail = `owner_revert_${runTag}@example.com`;

  const createdUserEmails = [stEmail, ownerEmail];
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
      "http://localhost/api/storyteller/characters/x/revert",
      "POST",
      { version: 1 },
    );

    // Algumas rotas usam requireAuth que lança Error em vez de retornar Response.
    // Aqui validamos que a chamada falha com status 401.
    await expect(
      POST(
        req as any,
        { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
      ) as any,
    ).rejects.toMatchObject({ status: 401 });
  });

  test("404 quando character não existir", async () => {
    const stId = await seedTestUser(stEmail, true);
    const token = await makeToken({ sub: stId, email: stEmail, name: "ST" });

    const req = makeNextJsonRequest(
      "http://localhost/api/storyteller/characters/00000000-0000-0000-0000-000000000000/revert",
      "POST",
      { version: 1 },
      { Authorization: `Bearer ${token}` },
    );

    const res = await POST(
      req as any,
      { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
    );
    expect(res.status).toBe(404);
  });

  test("200 reverte para snapshot anterior (usa characters_history)", async () => {
    const stId = await seedTestUser(stEmail, true);
    const ownerId = await seedTestUser(ownerEmail, true);

    // cria character (DRAFT) e dá role do ST no game
    const seeded = await seedCharacter(ownerId, "DRAFT_PHASE1", runTag);
    createdCharacterIds.push(seeded.characterId);
    createdGameIds.push(seeded.gameId);

    await pool.query(
      `INSERT INTO public.user_game_roles (user_id, game_id, role_id)
       VALUES ($1,$2,1)
       ON CONFLICT (user_id, game_id) DO UPDATE SET role_id = EXCLUDED.role_id`,
      [stId, seeded.gameId],
    );

    // 1) update para gerar snapshot em characters_history (trigger before update)
    const before = await pool.query(
      `SELECT sheet, version FROM public.characters WHERE id=$1`,
      [seeded.characterId],
    );
    const v1 = Number(before.rows[0].version);
    const originalSheet = before.rows[0].sheet;

    await pool.query(
      `UPDATE public.characters SET sheet = sheet || $2::jsonb WHERE id=$1`,
      [seeded.characterId, JSON.stringify({ name: "Changed Name", runTag })],
    );

    const mid = await pool.query(
      `SELECT sheet, version FROM public.characters WHERE id=$1`,
      [seeded.characterId],
    );
    const v2 = Number(mid.rows[0].version);
    expect(v2).toBeGreaterThanOrEqual(v1); // triggers may also bump version

    // 2) chama revert para voltar para versão anterior (v1)
    const token = await makeToken({ sub: stId, email: stEmail, name: "ST" });

    const body: any = {
      version: v1,
      toVersion: v1,
      historyVersion: v1,
    };

    const req = makeNextJsonRequest(
      `http://localhost/api/storyteller/characters/${seeded.characterId}/revert`,
      "POST",
      body,
      { Authorization: `Bearer ${token}` },
    );

    const res = await POST(
      req as any,
      { params: { id: seeded.characterId } } as any,
    );
    expect([200, 201].includes(res.status)).toBe(true);

    const after = await pool.query(
      `SELECT sheet FROM public.characters WHERE id=$1`,
      [seeded.characterId],
    );

    // deve ter voltado ao "originalSheet" ou ao menos desfeito o "Changed Name"
    const afterSheet = after.rows[0].sheet;
    expect(
      afterSheet?.name === originalSheet?.name ||
        afterSheet?.name !== "Changed Name",
    ).toBe(true);
  });
});
