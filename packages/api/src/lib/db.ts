import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export async function getDB(env: Env) {
	const pg = postgres(env.PG_HYPERDRIVE.connectionString, { max: 5 });
	const db = drizzle(pg);
	return db;
}
