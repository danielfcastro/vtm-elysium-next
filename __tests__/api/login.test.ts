// __tests__/api/login.test.ts
import { POST as loginRoute } from "@/app/api/login/route";
import { makeNextJsonRequest } from "../helpers/testRequest";
import {
    resetUsersTable,
    seedTestUsers,
    TEST_ST_EMAIL,
    TEST_INACTIVE_EMAIL,
    TEST_PASSWORD,
} from "../helpers/testDb";
import { pool } from "@/lib/db";
jest.mock("jose");

describe("/api/login", () => {
    beforeAll(async () => {
        await resetUsersTable();
        await seedTestUsers();
    });

    afterAll(async () => {
        await pool.end();
    });

    // T1 – Login bem-sucedido
    it("deve retornar token e user em login válido", async () => {
        const req = makeNextJsonRequest(
            "http://localhost/api/login",
            "POST",
            {
                email: TEST_ST_EMAIL,
                password: TEST_PASSWORD,
            },
        );

        const res = await loginRoute(req);
        expect(res.status).toBe(200);

        const json: any = await res.json();
        expect(typeof json.token).toBe("string");
        expect(json.token.length).toBeGreaterThan(10);
        expect(json.user).toBeDefined();
        expect(json.user.email).toBe(TEST_ST_EMAIL);
        expect(json.user.name).toBe("Storyteller");
    });

    // T2 – Email válido, senha incorreta
    it("deve retornar 401 quando senha estiver incorreta", async () => {
        const req = makeNextJsonRequest(
            "http://localhost/api/login",
            "POST",
            {
                email: TEST_ST_EMAIL,
                password: "SenhaErrada",
            },
        );

        const res = await loginRoute(req);
        expect(res.status).toBe(401);

        const json: any = await res.json();
        expect(json.token).toBeUndefined();
        expect(json.error).toBeDefined();
    });

    // T3 – Email não existente
    it("deve retornar 401 quando email não existir", async () => {
        const req = makeNextJsonRequest(
            "http://localhost/api/login",
            "POST",
            {
                email: "naoexiste@example.com",
                password: "qualquercoisa",
            },
        );

        const res = await loginRoute(req);
        expect(res.status).toBe(401);

        const json: any = await res.json();
        expect(json.error).toBeDefined();
    });

    // T4 – Usuário inativo
    it("deve retornar 403 quando usuário estiver inativo", async () => {
        const req = makeNextJsonRequest(
            "http://localhost/api/login",
            "POST",
            {
                email: TEST_INACTIVE_EMAIL,
                password: TEST_PASSWORD,
            },
        );

        const res = await loginRoute(req);
        expect(res.status).toBe(403);

        const json: any = await res.json();
        expect(json.error).toMatch(/Conta desativada/i);
    });

    // T5 – Campos obrigatórios faltando
    it("deve retornar 400 quando email ou senha faltarem", async () => {
        const req1 = makeNextJsonRequest(
            "http://localhost/api/login",
            "POST",
            { password: TEST_PASSWORD },
        );

        const res1 = await loginRoute(req1);
        expect(res1.status).toBe(400);

        const req2 = makeNextJsonRequest(
            "http://localhost/api/login",
            "POST",
            { email: TEST_ST_EMAIL },
        );

        const res2 = await loginRoute(req2);
        expect(res2.status).toBe(400);
    });

    // T6 – SQL Injection (tentativa) no email
    it("não deve permitir login com tentativa de SQL injection", async () => {
        const req = makeNextJsonRequest(
            "http://localhost/api/login",
            "POST",
            {
                email: `${TEST_ST_EMAIL}' OR '1'='1`,
                password: TEST_PASSWORD,
            },
        );

        const res = await loginRoute(req);
        expect(res.status).toBe(401);

        const json: any = await res.json();
        expect(json.error).toBeDefined();
    });

    // T7 – Email com case diferente (se citext estiver habilitado)
    it("deve aceitar email com case diferente (citext)", async () => {
        const req = makeNextJsonRequest(
            "http://localhost/api/login",
            "POST",
            {
                email: TEST_ST_EMAIL.toUpperCase(),
                password: TEST_PASSWORD,
            },
        );

        const res = await loginRoute(req);
        // Se por algum motivo não estiver com citext, esse teste pode falhar.
        // Ajuste para 401 se preferir case-sensitive.
        expect(res.status).toBe(200);

        const json: any = await res.json();
        expect(json.user.email).toBe(TEST_ST_EMAIL);
    });
});
