// src/lib/auth.ts
import { jwtVerify } from "jose";

export type AuthUser = {
  id: string; // alias de sub (para uso no app)
  sub: string; // mantém compatibilidade
  email: string;
  name: string;
};

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const encoder = new TextEncoder();
const secret = encoder.encode(JWT_SECRET);

export async function getUserFromRequest(
  req: Request,
): Promise<AuthUser | null> {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);

    const sub = payload.sub;
    const email = payload.email;
    const name = payload.name;

    if (!sub || typeof sub !== "string") return null;
    if (!email || typeof email !== "string") return null;
    if (!name || typeof name !== "string") return null;

    return { id: sub, sub, email, name };
  } catch (err) {
    console.error("JWT verification error:", err);
    return null;
  }
}

export async function requireAuth(req: Request): Promise<AuthUser> {
  const user = await getUserFromRequest(req);
  if (!user) {
    const err = new Error("Invalid or missing token");
    (err as any).status = 401;
    throw err;
  }
  return user;
}

// compat
export const requireUser = requireAuth;
