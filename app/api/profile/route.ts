// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function PATCH(req: NextRequest) {
  const user = await requireAuth(req);

  try {
    const body = await req.json();
    const name = body.name ? String(body.name).trim() : null;
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const currentPassword = body.currentPassword
      ? String(body.currentPassword)
      : null;
    const newPassword = body.newPassword ? String(body.newPassword) : null;

    if (!name && !email && !newPassword) {
      return NextResponse.json(
        { error: "Nenhuma alteração fornecida." },
        { status: 400 },
      );
    }

    if (email) {
      const existing = await pool.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2 LIMIT 1`,
        [email, user.sub],
      );
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: "Email já está em uso." },
          { status: 409 },
        );
      }
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Senha atual é obrigatória para alterar a senha." },
          { status: 400 },
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Nova senha deve ter pelo menos 6 caracteres." },
          { status: 400 },
        );
      }

      const userRes = await pool.query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [user.sub],
      );

      if (userRes.rows.length === 0) {
        return NextResponse.json(
          { error: "Usuário não encontrado." },
          { status: 404 },
        );
      }

      const passwordOk = await bcrypt.compare(
        currentPassword,
        userRes.rows[0].password_hash,
      );

      if (!passwordOk) {
        return NextResponse.json(
          { error: "Senha atual incorreta." },
          { status: 401 },
        );
      }

      const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await pool.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [newHash, user.sub],
      );
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (email) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email);
    }

    if (updates.length > 0) {
      params.push(user.sub);
      await pool.query(
        `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex}`,
        params,
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Error updating profile:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar perfil." },
      { status: 500 },
    );
  }
}
