// __mocks__/jose.ts
// Mock simples de 'jose' para uso em testes com Jest (CJS).
// NÃO usar em produção.

type JWTPayload = Record<string, any>;

export class SignJWT {
  private payload: JWTPayload;
  private header: Record<string, any> = {};
  private iat?: number;
  private exp?: string | number | Date;

  constructor(payload: JWTPayload) {
    this.payload = payload;
  }

  setProtectedHeader(header: Record<string, any>) {
    this.header = header;
    return this;
  }

  setIssuedAt() {
    this.iat = Math.floor(Date.now() / 1000);
    return this;
  }

  setExpirationTime(exp: string | number | Date) {
    this.exp = exp;
    return this;
  }

  async sign(secret: Uint8Array | string): Promise<string> {
    const data = {
      header: this.header,
      payload: this.payload,
      iat: this.iat,
      exp: this.exp,
    };

    const json = JSON.stringify(data);
    const base64 = Buffer.from(json, "utf8").toString("base64url");

    // Apenas uma string com 3 partes para parecer um JWT
    return `mock.${base64}.sig`;
  }
}

export async function jwtVerify(token: string, secret: Uint8Array | string) {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "mock") {
    throw new Error("Invalid token format");
  }

  const json = Buffer.from(parts[1], "base64url").toString("utf8");
  const data = JSON.parse(json);

  return { payload: data.payload };
}
