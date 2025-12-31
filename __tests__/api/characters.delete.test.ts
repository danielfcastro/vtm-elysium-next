import { DELETE as characterDeleteRoute } from "@/app/api/characters/[id]/route";
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
 * Seed robusto para games (FKs -> users), igual ao que funcionou no GET.
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

        if (c.column_name === "id") {
            insertCols.push("id");
            insertVals.push(gameId);
            placeholders.push(`$${insertVals.length}`);
            continue;
        }

        // FK -> users: sempre setar userId real
        if (gamesUserFkCols.has(c.column_name)) {
            insertCols.push(c.column_name);
            insertVals.push(userId);
            placeholders.push(`$${insertVals.length}`);
            continue;
        }

        if (!needsValue) continue;

        insertCols.push(c.column_name);

        const dt = c.data_type;
        const udt = c.udt_name;

        if (dt === "uuid") insertVals.push(crypto.randomUUID());
        else if (dt === "boolean") insertVals.push(true);
        else if (dt === "integer" || dt === "smallint" || dt === "bigint")
            insertVals.push(1);
        else if (dt === "numeric" || dt === "double precision" || dt === "real")
            insertVals.push(0);
        else if (dt === "json" || dt === "jsonb") insertVals.push({});
        else if (dt.includes("timestamp") || dt === "date")
            insertVals.push(new Date().toISOString());
        else if (dt === "text" || dt.includes("character")) {
            if (c.column_name === "name" || c.column_name === "title")
                insertVals.push("Test Game");
            else insertVals.push("test");
        } else if (dt === "USER-DEFINED") {
            const enumLabel = await getFirstEnumLabel(udt);
            insertVals.push(enumLabel ?? "test");
        } else insertVals.push("test");

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

/**
 * Seed de character em status específico.
 * Como status é enum (character_status), fazemos cast via ::character_status.
 */
const createdGameIds: string[] = [];
const createdCharacterIds: string[] = [];

async function seedCharacter(ownerUserId: string, statusLabel: string) {
    const gameId = await ensureTestGameForUser(ownerUserId);
    createdGameIds.push(gameId);

    // Campos coerentes com o status para satisfazer chk_characters_submitted_fields
    // - Draft: tudo NULL
    // - Submitted: submitted_at NOT NULL e o resto NULL
    const nowIso = new Date().toISOString();

    const isSubmitted = statusLabel === "SUBMITTED";

    const submittedAt = isSubmitted ? nowIso : null;
    const approvedAt = null;
    const approvedByUserId = null;
    const rejectedAt = null;
    const rejectedByUserId = null;
    const rejectionReason = null;

    const r = await pool.query(
        `
    INSERT INTO public.characters (
      game_id,
      owner_user_id,
      status,
      submitted_at,
      approved_at,
      approved_by_user_id,
      rejected_at,
      rejected_by_user_id,
      rejection_reason,
      sheet,
      total_experience,
      spent_experience,
      version,
      created_at,
      updated_at,
      deleted_at
    )
    VALUES (
      $2,
      $1,
      $3::character_status,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10::jsonb,
      0,
      0,
      1,
      NOW(),
      NOW(),
      NULL
    )
    RETURNING id
    `,
        [
            ownerUserId,
            gameId,
            statusLabel,
            submittedAt,
            approvedAt,
            approvedByUserId,
            rejectedAt,
            rejectedByUserId,
            rejectionReason,
            JSON.stringify({ phase: 1, name: "Char For Delete Test" }),
        ],
    );

    const characterId = r.rows[0].id as string;
    createdCharacterIds.push(characterId);
    return characterId;
}


describe("DELETE /api/characters/:id", () => {
    let ownerUserId: string;
    let draftCharacterId: string;
    let nonDraftCharacterId: string;

    beforeAll(async () => {
        await resetUsersTable();
        await seedTestUsers();

        ownerUserId = await getUserIdByEmail(TEST_ST_EMAIL);

        // limpa resíduos do usuário de teste
        await pool.query(`DELETE FROM public.characters WHERE owner_user_id = $1`, [
            ownerUserId,
        ]);

        // Um draft deletável
        draftCharacterId = await seedCharacter(ownerUserId, "DRAFT_PHASE1");

        // Um não-draft (ajuste se seu enum usar outro label, ex: SUBMITTED)
        // Se esse label não existir no seu enum, troque por outro status não editável do seu schema.
        nonDraftCharacterId = await seedCharacter(ownerUserId, "SUBMITTED");
    });

    afterAll(async () => {
        // limpa characters criados
        if (createdCharacterIds.length > 0) {
            await pool.query(
                `DELETE FROM public.characters WHERE id = ANY($1::uuid[])`,
                [createdCharacterIds],
            );
        }

        // limpa games criados
        if (createdGameIds.length > 0) {
            await pool.query(`DELETE FROM public.games WHERE id = ANY($1::uuid[])`, [
                createdGameIds,
            ]);
        }

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
        const token = await getTokenForTestUser();
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
        const token = await getTokenForTestUser();

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
        const token = await getTokenForTestUser();

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

        // Confere no DB que deletou
        const r = await pool.query(
            `SELECT deleted_at FROM public.characters WHERE id = $1 LIMIT 1`,
            [draftCharacterId],
        );

        expect(r.rowCount).toBe(1);
        expect(r.rows[0].deleted_at).toBeTruthy();

        // E que o GET agora deve retornar 404 (por deleted_at IS NULL)
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
