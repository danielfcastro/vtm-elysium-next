// __tests__/helpers/testDb.ts
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

export const TEST_ST_EMAIL = "st@example.com";
export const TEST_INACTIVE_EMAIL = "inactive@example.com";
export const TEST_PASSWORD = "SenhaForte123";

// Se você NÃO quiser que os testes apaguem seus usuários reais, pode deixar
// isso vazio ou só lidar com user_game_roles. Ajuste conforme a sua preferência.
export async function resetUsersTable() {
    // Exemplo conservador (não apaga seus usuários manuais):
    // await pool.query("DELETE FROM user_game_roles");
    // Se quiser limpeza total para testes, use:
    // await pool.query("DELETE FROM user_game_roles");
    // await pool.query("DELETE FROM users");
}

export async function seedTestUsers() {
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    // Usuário ST de teste (ativo)
    await pool.query(
        `
            INSERT INTO users (email, password_hash, name, is_active)
            VALUES ($1, $2, $3, true)
                ON CONFLICT (email) DO UPDATE
                                           SET password_hash = EXCLUDED.password_hash,
                                           name = EXCLUDED.name,
                                           is_active = EXCLUDED.is_active
        `,
        [TEST_ST_EMAIL, hash, "Storyteller"],
    );

    // Usuário inativo de teste
    await pool.query(
        `
            INSERT INTO users (email, password_hash, name, is_active)
            VALUES ($1, $2, $3, false)
                ON CONFLICT (email) DO UPDATE
                                           SET password_hash = EXCLUDED.password_hash,
                                           name = EXCLUDED.name,
                                           is_active = EXCLUDED.is_active
        `,
        [TEST_INACTIVE_EMAIL, hash, "Inativo Teste"],
    );
}
