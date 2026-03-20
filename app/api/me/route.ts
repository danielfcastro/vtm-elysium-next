// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authUser = await getUserFromRequest(req); // <- OBRIGATORIAMENTE await

  if (!authUser) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { rows } = await pool.query(
    `
            SELECT id, email, name, is_active
            FROM users
            WHERE id = $1
                LIMIT 1
        `,
    [authUser.sub],
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 },
    );
  }

  const user = rows[0];

  // Check if user is a storyteller in any game
  const roleRows = await pool.query(
    `SELECT r.name as role FROM user_game_roles ugr 
     JOIN roles r ON ugr.role_id = r.id 
     WHERE ugr.user_id = $1 AND r.name = 'STORYTELLER' LIMIT 1`,
    [authUser.sub],
  );

  const isStoryteller = roleRows.rows.length > 0;

  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      is_active: user.is_active,
      isStoryteller,
    },
    { status: 200 },
  );
}
