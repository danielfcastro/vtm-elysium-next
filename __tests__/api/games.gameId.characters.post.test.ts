// __tests__/api/games.gameId.characters.post.test.ts
import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { POST } from "@/app/api/games/[gameId]/characters/route";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
    cleanupTestArtifacts,
    ensureTestGameForUser,
    makeRunTag,
    seedTestUser,
} from "../helpers/testDb";

function secretKey() {
    return new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");
}
async function makeToken(payload: { sub: string; email: string; name: string }) {
    return await new SignJWT({ sub: payload.sub, email: payload.email, name: payload.name })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(secretKey());
}

describe("POST /api/games/:gameId/characters", () => {
    const runTag = makeRunTag("games-ch-post");
    const userEmail = `gc_user_${runTag}@example.com`;

    const createdUserEmails = [userEmail];
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

    test("403 se usuário não tiver role no game", async () => {
        const userId = await seedTestUser(userEmail, true);
        const gameId = await ensureTestGameForUser(userId, `GameNoRole-${runTag}`);
        createdGameIds.push(gameId);

        const token = await makeToken({ sub: userId, email: userEmail, name: "User" });

        // remove role para simular sem acesso
        await pool.query(`DELETE FROM public.user_game_roles WHERE user_id=$1 AND game_id=$2`, [
            userId,
            gameId,
        ]);

        const req = makeNextJsonRequest(
            `http://localhost/api/games/${gameId}/characters`,
            "POST",
            {},
            { Authorization: `Bearer ${token}` },
        );

        const res = await POST(req as any, { params: Promise.resolve({ gameId }) });
        expect(res.status).toBe(403);
    });

    test("201 cria personagem DRAFT_PHASE1 (ou 200 se já existir)", async () => {
        const userId = await seedTestUser(userEmail, true);
        const gameId = await ensureTestGameForUser(userId, `Game-${runTag}`);
        createdGameIds.push(gameId);

        // garante role no game
        await pool.query(
            `INSERT INTO public.user_game_roles (user_id, game_id, role)
       VALUES ($1,$2,'PLAYER')
       ON CONFLICT (user_id, game_id) DO UPDATE SET role = EXCLUDED.role`,
            [userId, gameId],
        );

        const token = await makeToken({ sub: userId, email: userEmail, name: "User" });

        const req1 = makeNextJsonRequest(
            `http://localhost/api/games/${gameId}/characters`,
            "POST",
            {},
            { Authorization: `Bearer ${token}` },
        );
        const res1 = await POST(req1 as any, { params: Promise.resolve({ gameId }) });
        expect([200, 201]).toContain(res1.status);

        const json1: any = await res1.json();
        expect(json1.character?.id).toBeDefined();
        createdCharacterIds.push(json1.character.id);

        // segunda chamada deve retornar o mesmo personagem (200)
        const req2 = makeNextJsonRequest(
            `http://localhost/api/games/${gameId}/characters`,
            "POST",
            {},
            { Authorization: `Bearer ${token}` },
        );
        const res2 = await POST(req2 as any, { params: Promise.resolve({ gameId }) });
        expect(res2.status).toBe(200);
        const json2: any = await res2.json();
        expect(json2.character.id).toBe(json1.character.id);
    });
});
