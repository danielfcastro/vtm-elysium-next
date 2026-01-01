import { POST } from "@/app/api/characters/generate/route";
import { makeNextJsonRequest } from "../helpers/testRequest";

describe("POST /api/characters/generate", () => {
  test("200 retorna seed e character", async () => {
    const req = makeNextJsonRequest(
      "http://localhost/api/characters/generate",
      "POST",
      { seed: "unit-test-seed-1" },
    );
    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.seed).toBe("unit-test-seed-1");
    expect(body.character).toBeTruthy();
  });

  test("determinístico: mesmo seed retorna mesmo character", async () => {
    const req1 = makeNextJsonRequest(
      "http://localhost/api/characters/generate",
      "POST",
      { seed: "unit-test-seed-2" },
    );
    const res1 = await POST(req1 as any);
    const b1 = await res1.json();

    const req2 = makeNextJsonRequest(
      "http://localhost/api/characters/generate",
      "POST",
      { seed: "unit-test-seed-2" },
    );
    const res2 = await POST(req2 as any);
    const b2 = await res2.json();

    expect(JSON.stringify(b1.character)).toBe(JSON.stringify(b2.character));
  });
});
