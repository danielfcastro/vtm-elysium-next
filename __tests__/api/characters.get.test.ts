// __tests__/api/characters.get.test.ts
import { GET as characterGetRoute } from "@/app/api/characters/[id]/route";
import { POST as loginRoute } from "@/app/api/login/route";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
    resetUsersTable,
    seedTestUsers,
    TEST_ST_EMAIL,
    TEST_PASSWORD,
} from "../helpers/testDb";
import { pool } from "@/lib/db";
import { SignJWT } from "jose";

jest.mock("jose");

/**
 * Helpers de seed:
 * - public.characters.game_id -> FK para public.games
 * - public.games possui FKs para public.users (ex: storyteller_id)
 *
 * Portanto:
 * 1) criar um game válido antes do character
 * 2) toda coluna em games que seja FK -> users.id deve receber um userId real
 */

async function getFirstEnumLabel(typeName: string): Promise<string | null> {
    const r = await pool.query(
        `
            SELECT e.enumlabel
            FROM pg_type t
                     JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = $1
            ORDER BY e.enumsortorder
                LIMIT 1
        `,
        [typeName],
    );

    return (r.rowCount ?? 0) > 0 ? (r.rows[0].enumlabel as string) : null;
}

type ColumnInfo = {
    column_name: string;
    is_nullable: "YES" | "NO";
    column_default: string | null;
    data_type: string;
    udt_name: string;
};

/**
 * Versão robusta: usa pg_catalog para descobrir colunas FK de public.games -> public.users.
 * Isso cobre constraints com nomes como games_storyteller_id_fkey, independentemente de como o schema foi criado.
 */
async function getGamesToUsersFkColumns(): Promise<Set<string>> {
    const r = await pool.query<{ attname: string }>(
        `
            SELECT a.attname
            FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                     JOIN pg_class frel ON frel.oid = con.confrelid
                     JOIN pg_namespace fnsp ON fnsp.oid = frel.relnamespace
                     JOIN unnest(con.conkey) AS k(attnum) ON true
                     JOIN pg_attribute a ON a.attrelid = rel.oid AND a.attnum = k.attnum
            WHERE con.contype = 'f'
              AND nsp.nspname = 'public'
              AND rel.relname = 'games'
              AND fnsp.nspname = 'public'
              AND frel.relname = 'users'
        `,
    );

    const s = new Set<string>();
    for (const row of r.rows) s.add(row.attname);
    return s;
}

async function ensureTestGameForUser(userId: string): Promise<string> {
    const gameId = crypto.randomUUID();
    const gamesUserFkCols = await getGamesToUsersFkColumns();

    const colsRes = await pool.query<ColumnInfo>(
        `
            SELECT column_name, is_nullable, column_default, data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'games'
            ORDER BY ordinal_position
        `,
    );

    if ((colsRes.rowCount ?? 0) === 0) {
        throw new Error("Tabela public.games não encontrada ou sem colunas visíveis");
    }

    const cols = colsRes.rows;

    const insertCols: string[] = [];
    const insertVals: any[] = [];
    const placeholders: string[] = [];

    for (const c of cols) {
        const needsValue = c.is_nullable === "NO" && !c.column_default;

        // Sempre setamos o id se existir, para controle de limpeza
        if (c.column_name === "id") {
            insertCols.push("id");
            insertVals.push(gameId);
            placeholders.push(`$${insertVals.length}`);
            continue;
        }

        // REGRA CRÍTICA:
        // Se for FK -> users, sempre setamos userId, mesmo se houver default e mesmo se for nullable.
        if (gamesUserFkCols.has(c.column_name)) {
            insertCols.push(c.column_name);
            insertVals.push(userId);
            placeholders.push(`$${insertVals.length}`);
            continue;
        }

        // Para outras colunas, só preenche se for NOT NULL e sem default
        if (!needsValue) continue;

        insertCols.push(c.column_name);

        const dt = c.data_type;
        const udt = c.udt_name;

        if (dt === "uuid") {
            insertVals.push(crypto.randomUUID());
        } else if (dt === "boolean") {
            insertVals.push(true);
        } else if (dt === "integer" || dt === "smallint" || dt === "bigint") {
            insertVals.push(1);
        } else if (dt === "numeric" || dt === "double precision" || dt === "real") {
            insertVals.push(0);
        } else if (dt === "json" || dt === "jsonb") {
            insertVals.push({});
        } else if (dt.includes("timestamp") || dt === "date") {
            insertVals.push(new Date().toISOString());
        } else if (dt === "text" || dt.includes("character")) {
            if (c.column_name === "name" || c.column_name === "title") {
                insertVals.push("Test Game");
            } else {
                insertVals.push("test");
            }
        } else if (dt === "USER-DEFINED") {
            const enumLabel = await getFirstEnumLabel(udt);
            insertVals.push(enumLabel ?? "test");
        } else {
            insertVals.push("test");
        }

        placeholders.push(`$${insertVals.length}`);
    }

    const sql = `
        INSERT INTO public.games (${insertCols.join(", ")})
        VALUES (${placeholders.join(", ")})
            RETURNING id
    `;

    const ins = await pool.query(sql, insertVals);
    return ins.rows[0].id as string;
}

async function getTokenForTestUser() {
    const req = makeNextJsonRequest("http://localhost/api/login", "POST", {
        email: TEST_ST_EMAIL,
        password: TEST_PASSWORD,
    });

    const res = await loginRoute(req);
    if (res.status !== 200) {
        throw new Error(`Login de teste falhou com status ${res.status}`);
    }

    const json: any = await res.json();
    return json.token as string;
}

async function getUserIdByEmail(email: string): Promise<string> {
    const r = await pool.query(
        `SELECT id FROM public.users WHERE email = $1 LIMIT 1`,
        [email],
    );
    if ((r.rowCount ?? 0) === 0) {
        throw new Error(`Usuário de teste não encontrado para email ${email}`);
    }
    return r.rows[0].id as string;
}

// Mantém assinatura original: retorna string (characterId). Guardamos gameId para cleanup.
let seededGameId: string | null = null;

async function seedCharacterForOwner(ownerUserId: string): Promise<string> {
    seededGameId = await ensureTestGameForUser(ownerUserId);

    const r = await pool.query(
        `
            INSERT INTO public.characters (
                game_id,
                owner_user_id,
                status,
                sheet,
                total_experience,
                spent_experience,
                version
            )
            VALUES (
                       $2,
                       $1,
                       'DRAFT_PHASE1',
                       $3::jsonb,
                       0,
                       0,
                       1
                   )
                RETURNING id
        `,
        [ownerUserId, seededGameId, JSON.stringify({ phase: 1, name: "Test Char" })],
    );

    return r.rows[0].id as string;
}

describe("GET /api/characters/:id", () => {
    let ownerUserId: string;
    let characterId: string;

    beforeAll(async () => {
        await resetUsersTable();
        await seedTestUsers();

        ownerUserId = await getUserIdByEmail(TEST_ST_EMAIL);

        await pool.query(`DELETE FROM public.characters WHERE owner_user_id = $1`, [
            ownerUserId,
        ]);

        characterId = await seedCharacterForOwner(ownerUserId);
    });

    afterAll(async () => {
        await pool.query(`DELETE FROM public.characters WHERE owner_user_id = $1`, [
            ownerUserId,
        ]);

        if (seededGameId) {
            await pool.query(`DELETE FROM public.games WHERE id = $1`, [seededGameId]);
            seededGameId = null;
        }

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
        const token = await getTokenForTestUser();
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
            `http://localhost/api/characters/${characterId}`,
            "GET",
            undefined,
            { Authorization: `Bearer ${token}` },
        );

        const res = await characterGetRoute(req, { params: { id: characterId } });
        expect(res.status).toBe(403);

        const json: any = await res.json();
        expect(json.error).toMatch(/forbidden/i);
    });

    it("deve retornar 200 e o character quando token for do owner", async () => {
        const token = await getTokenForTestUser();

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
