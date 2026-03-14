// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "365d";

// Reuso do TextEncoder para não recriar a cada request
const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios." },
        { status: 400 },
      );
    }

    // Query parametrizada → proteção contra SQL injection
    const { rows } = await pool.query(
      `
                SELECT id, email, password_hash, name, is_active
                FROM users
                WHERE email = $1
                    LIMIT 1
            `,
      [email],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 },
      );
    }

    const user = rows[0];

    if (!user.is_active) {
      return NextResponse.json(
        { error: "Conta desativada. Contate o Narrador/Administrador." },
        { status: 403 },
      );
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 },
      );
    }

    // Geração de JWT com jose
    // Algoritmo HS256, expiração configurável (default: 365d = 1 ano)
    const secret = encoder.encode(JWT_SECRET);

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN) // ex: "1d"
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
      { status: 200 },
    );
  } catch (err) {
    console.error("Error in /api/login:", err);
    return NextResponse.json(
      { error: "Erro interno ao autenticar." },
      { status: 500 },
    );
  }
}
