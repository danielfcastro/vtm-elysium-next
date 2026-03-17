// src/lib/auth.ts
import { jwtVerify } from "jose";
import { pool } from "./db";

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

async function ensureUserExists(user: AuthUser): Promise<void> {
  try {
    // Check if user exists
    const existing = await pool.query(
      "SELECT id FROM public.users WHERE id = $1",
      [user.id],
    );

    if (existing.rowCount === 0) {
      // Auto-provision user - set a placeholder password hash
      // User should change password via profile or reset flow
      await pool.query(
        `INSERT INTO public.users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)`,
        [user.id, user.email, user.name, "auto-provisioned"],
      );
      console.log(`[AUTH] Auto-provisioned user: ${user.id}`);
    }
  } catch (err) {
    console.error("[AUTH] Error ensuring user exists:", err);
    // Don't throw - let the request continue
  }
}

export async function requireAuth(req: Request): Promise<AuthUser> {
  const user = await getUserFromRequest(req);
  if (!user) {
    const err = new Error("Invalid or missing token");
    (err as any).status = 401;
    throw err;
  }

  // Auto-provision user if they don't exist in the database
  await ensureUserExists(user);

  return user;
}

// compat
export const requireUser = requireAuth;
