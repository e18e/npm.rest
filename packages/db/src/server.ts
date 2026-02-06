import { drizzle } from 'drizzle-orm/postgres-js';
import { getLogger } from '@logtape/drizzle-orm';
import { env } from 'node:process';
import postgres from 'postgres';

const pg = postgres({
	user: env.POSTGRES_USER!,
	password: env.POSTGRES_PASSWORD!,
	database: env.POSTGRES_DB!,
	port: Number.parseInt(env.POSTGRES_PORT!, 10),
	host: env.POSTGRES_HOST!,
});

export const db = drizzle(pg, {
	logger: getLogger({ category: 'db' }),
	casing: 'snake_case',
});
