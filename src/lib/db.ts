// src/lib/db.ts
import { Pool, type QueryResult, type QueryResultRow } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ wrapper compatível com os handlers
export function getPool(): Pool {
  return pool;
}

// Mantém compatibilidade com handlers que importam { query } de "@/lib/db"
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
