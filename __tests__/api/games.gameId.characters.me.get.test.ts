// __tests__/api/games.gameId.characters.me.get.test.ts
import { pool } from "@/lib/db";
import { SignJWT } from "jose";
import { GET } from "@/app/api/games/[gameId]/characters/me/route";
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

describe("GET /api/games/:gameId/characters/me", () => {
    const runTag = makeRunTag("games-ch-me");
    const userEmail = `gcm_user_${runTag}@example.com`;

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
        const gameId = await ensureTestGameForUser(userId, `Game-${runTag}`);
        createdGameIds.push(gameId);

        // remove role
        await pool.query(`DELETE FROM public.user_game_roles WHERE user_id=$1 AND game_id=$2`, [
            userId,
            gameId,
        ]);

        const token = await makeToken({ sub: userId, email: userEmail, name: "User" });
        const req = makeNextJsonRequest(
            `http://localhost/api/games/${gameId}/characters/me`,
            "GET",
            undefined,
            { Authorization: `Bearer ${token}` },
        );

        const res = await GET(req as any, { params: Promise.resolve({ gameId }) } as any);
        expect(res.status).toBe(403);
    });

    test("200 retorna character null quando não existe", async () => {
        const userId = await seedTestUser(userEmail, true);
        const gameId = await ensureTestGameForUser(userId, `Game2-${runTag}`);
        createdGameIds.push(gameId);

        // garante role
        await pool.query(
            `INSERT INTO public.user_game_roles (user_id, game_id, role)
       VALUES ($1,$2,'PLAYER')
       ON CONFLICT (user_id, game_id) DO UPDATE SET role = EXCLUDED.role`,
            [userId, gameId],
        );

        const token = await makeToken({ sub: userId, email: userEmail, name: "User" });
        const req = makeNextJsonRequest(
            `http://localhost/api/games/${gameId}/characters/me`,
            "GET",
            undefined,
            { Authorization: `Bearer ${token}` },
        );

        const res = await GET(req as any, { params: Promise.resolve({ gameId }) } as any);
        expect(res.status).toBe(200);

        const json: any = await res.json();
        expect(json.character).toBeNull();
    });

    test("200 retorna character quando existe", async () => {
        const userId = await seedTestUser(userEmail, true);
        const gameId = await ensureTestGameForUser(userId, `Game3-${runTag}`);
        createdGameIds.push(gameId);

        await pool.query(
            `INSERT INTO public.user_game_roles (user_id, game_id, role)
       VALUES ($1,$2,'PLAYER')
       ON CONFLICT (user_id, game_id) DO UPDATE SET role = EXCLUDED.role`,
            [userId, gameId],
        );

        const ins = await pool.query<{ id: string }>(
            `INSERT INTO public.characters (game_id, owner_user_id, status, sheet, total_experience, spent_experience, version, created_at, updated_at)
       VALUES ($1,$2,'DRAFT_PHASE1',$3::jsonb,0,0,1,NOW(),NOW())
       RETURNING id`,
            [gameId, userId, JSON.stringify({ phase: 1, name: "Char" })],
        );
        createdCharacterIds.push(ins.rows[0].id);

        const token = await makeToken({ sub: userId, email: userEmail, name: "User" });
        const req = makeNextJsonRequest(
            `http://localhost/api/games/${gameId}/characters/me`,
            "GET",
            undefined,
            { Authorization: `Bearer ${token}` },
        );

        const res = await GET(req as any, { params: Promise.resolve({ gameId }) } as any);
        expect(res.status).toBe(200);

        const json: any = await res.json();
        expect(json.character.id).toBe(ins.rows[0].id);
    });
});