import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { PUT } from "@/app/api/storyteller/characters/[id]/move/route";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
  cleanupTestArtifacts,
  ensureTestGameForUser,
  makeRunTag,
  seedCharacter,
  seedTestUser,
} from "../helpers/testDb";

function secretKey() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
}
async function makeToken(payload: { sub: string; email: string; name: string }) {
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

describe("PUT /api/storyteller/characters/:id/move", () => {
  const runTag = makeRunTag("st-move");
  const stEmail = `st_move_${runTag}@example.com`;
  const ownerEmail = `owner_move_${runTag}@example.com`;
  const otherEmail = `other_move_${runTag}@example.com`;

  const createdUserEmails = [stEmail, ownerEmail, otherEmail];
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
      "http://localhost/api/storyteller/characters/x/move",
      "PUT",
      { toGameId: "00000000-0000-0000-0000-000000000000" },
    );
    const res = await PUT(
      req as any,
      { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
    );
    expect(res.status).toBe(401);
  });

  test("404 quando character não existir", async () => {
    const stId = await seedTestUser(stEmail, true);
    const token = await makeToken({ sub: stId, email: stEmail, name: "ST" });

    // O endpoint valida o corpo (ex.: destino) antes de checar o character.
    // Para garantir que chegamos no fluxo de 404, usamos um gameId válido como destino.
    const targetGameId = await ensureTestGameForUser(stId, `MoveTarget-${runTag}`);
    createdGameIds.push(targetGameId);

    const req = makeNextJsonRequest(
      "http://localhost/api/storyteller/characters/00000000-0000-0000-0000-000000000000/move",
      "PUT",
      { toGameId: targetGameId, gameId: targetGameId, targetGameId },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PUT(
      req as any,
      { params: { id: "00000000-0000-0000-0000-000000000000" } } as any,
    );
    expect(res.status).toBe(404);
  });

  test("403 quando usuário não tem permissão (não é STORYTELLER/ADMIN no game)", async () => {
    const otherId = await seedTestUser(otherEmail, true);
    const ownerId = await seedTestUser(ownerEmail, true);

    const seeded = await seedCharacter(ownerId, "DRAFT_PHASE1", runTag);
    createdCharacterIds.push(seeded.characterId);
    createdGameIds.push(seeded.gameId);

    // garante que o "other" NÃO está no game
    await pool.query(
      `DELETE FROM public.user_game_roles WHERE user_id=$1 AND game_id=$2`,
      [otherId, seeded.gameId],
    );

    const token = await makeToken({ sub: otherId, email: otherEmail, name: "Other" });

    const targetGameId = await ensureTestGameForUser(ownerId, `TargetGame-${runTag}`);
    createdGameIds.push(targetGameId);

    const req = makeNextJsonRequest(
      `http://localhost/api/storyteller/characters/${seeded.characterId}/move`,
      "PUT",
      { toGameId: targetGameId, gameId: targetGameId, targetGameId },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PUT(req as any, { params: { id: seeded.characterId } } as any);
    expect(res.status).toBe(403);
  });

  test("200 move character para outro game (game_id atualizado)", async () => {
    const stId = await seedTestUser(stEmail, true);
    const ownerId = await seedTestUser(ownerEmail, true);

    // cria character no game A
    const seeded = await seedCharacter(ownerId, "DRAFT_PHASE1", runTag);
    createdCharacterIds.push(seeded.characterId);
    createdGameIds.push(seeded.gameId);

    // cria game B cujo storyteller é o mesmo ST
    const targetGameId = await ensureTestGameForUser(stId, `MoveTo-${runTag}`);
    createdGameIds.push(targetGameId);

    // garante role do ST no game A e no game B
    await pool.query(
      `INSERT INTO public.user_game_roles (user_id, game_id, role)
       VALUES ($1,$2,'STORYTELLER')
       ON CONFLICT (user_id, game_id) DO UPDATE SET role = EXCLUDED.role`,
      [stId, seeded.gameId],
    );
    await pool.query(
      `INSERT INTO public.user_game_roles (user_id, game_id, role)
       VALUES ($1,$2,'STORYTELLER')
       ON CONFLICT (user_id, game_id) DO UPDATE SET role = EXCLUDED.role`,
      [stId, targetGameId],
    );

    const token = await makeToken({ sub: stId, email: stEmail, name: "ST" });

    const req = makeNextJsonRequest(
      `http://localhost/api/storyteller/characters/${seeded.characterId}/move`,
      "PUT",
      { toGameId: targetGameId, gameId: targetGameId, targetGameId },
      { Authorization: `Bearer ${token}` },
    );

    const res = await PUT(req as any, { params: { id: seeded.characterId } } as any);
    expect([200, 201].includes(res.status)).toBe(true);

    const chk = await pool.query(`SELECT game_id FROM public.characters WHERE id=$1`, [
      seeded.characterId,
    ]);
    expect(chk.rowCount).toBe(1);
    expect(chk.rows[0].game_id).toBe(targetGameId);
  });
});
