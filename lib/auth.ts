// lib/auth.ts
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export type AuthUser = {
  sub: string;
  email: string;
  name: string;
};

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const encoder = new TextEncoder();
const secret = encoder.encode(JWT_SECRET);

export async function getUserFromRequest(
    req: NextRequest,
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

    if (!sub) return null;
    if (!email || typeof email !== "string") return null;
    if (!name || typeof name !== "string") return null;

    return { sub, email, name };
  } catch (err) {
    console.error("JWT verification error:", err);
    return null;
  }
}
