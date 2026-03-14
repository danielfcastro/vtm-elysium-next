// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "365d";
const SALT_ROUNDS = 10;

const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Nome deve ter pelo menos 2 caracteres." },
        { status: 400 },
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 8 caracteres." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "As senhas não conferem." },
        { status: 400 },
      );
    }

    const existingUser = await pool.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "Email já cadastrado." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())
       RETURNING id, email, name`,
      [email, name, passwordHash],
    );

    const user = result.rows[0];

    const secret = encoder.encode(JWT_SECRET);
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(secret);

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Error in /api/register:", err);
    return NextResponse.json(
      { error: "Erro interno ao cadastrar." },
      { status: 500 },
    );
  }
}
