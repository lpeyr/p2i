import "server-only";
import * as mariadb from "mariadb";

export const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5,
});

export async function query<T>(sql: string, params = []): Promise<T> {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(sql, params);
        return rows as T;
    } finally {
        if (conn) await conn.release();
    }
}
