// __tests__/api/me.test.ts
import { GET as meRoute } from "@/app/api/me/route";
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

describe("/api/me", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(async () => {
    // silencia apenas o erro esperado de JWT inválido
    const original = console.error;
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation((...args: any[]) => {
        const msg = args[0];
        if (typeof msg === "string" && msg.includes("JWT verification error")) {
          // ignora esse log específico nos testes
          return;
        }

        // demais erros continuam aparecendo normalmente
        original(...args);
      });

    await resetUsersTable();
    await seedTestUsers();
  });

  afterAll(async () => {
    consoleErrorSpy.mockRestore();
    await pool.end();
  });

  // P1 – Sem header Authorization
  it("deve retornar 401 se não houver Authorization header", async () => {
    const req = makeNextJsonRequest("http://localhost/api/me", "GET");

    const res = await meRoute(req);
    expect(res.status).toBe(401);

    const json: any = await res.json();
    expect(json.error).toMatch(/não autorizado/i);
  });

  // P2 – Header Authorization malformado
  it("deve retornar 401 se Authorization for malformado", async () => {
    const req = makeNextJsonRequest(
      "http://localhost/api/me",
      "GET",
      undefined,
      { Authorization: "Token abc123" },
    );

    const res = await meRoute(req);
    expect(res.status).toBe(401);
  });

  // P3 – Token inválido (lixo)
  it("deve retornar 401 se o token for inválido", async () => {
    const req = makeNextJsonRequest(
      "http://localhost/api/me",
      "GET",
      undefined,
      { Authorization: "Bearer abc.def.ghi" },
    );

    const res = await meRoute(req);
    expect(res.status).toBe(401);
  });

  // P4 – Token válido, usuário existe
  it("deve retornar 200 e dados do usuário com token válido", async () => {
    const token = await getTokenForTestUser();

    const req = makeNextJsonRequest(
      "http://localhost/api/me",
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await meRoute(req);
    expect(res.status).toBe(200);

    const json: any = await res.json();
    expect(json.email).toBe(TEST_ST_EMAIL);
    expect(json.name).toBe("Storyteller");
  });

  // P5 – Token válido, mas usuário foi removido
  it("deve retornar 404 se usuário não existir mais", async () => {
    // gera um token com sub que não existe no banco
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "dev-secret-change-me",
    );

    const token = await new SignJWT({
      sub: "00000000-0000-0000-0000-000000000000", // id inexistente
      email: "ghost@example.com",
      name: "Ghost",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("1d")
      .sign(secret);

    const req = makeNextJsonRequest(
      "http://localhost/api/me",
      "GET",
      undefined,
      { Authorization: `Bearer ${token}` },
    );

    const res = await meRoute(req);
    expect(res.status).toBe(404);

    const json: any = await res.json();
    expect(json.error).toMatch(/usuário não encontrado/i);
  });
});
