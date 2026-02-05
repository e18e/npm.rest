import { drizzle } from 'drizzle-orm/postgres-js';
import { getLogger } from '@logtape/drizzle-orm';
import { env } from 'node:process';
import { join } from 'node:path';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: join(import.meta.dirname, '../../../.env'), quiet: true });

const pg = postgres({
	user: env.POSTGRES_USER!,
	password: env.POSTGRES_PASSWORD!,
	database: env.POSTGRES_DB!,
	port: Number.parseInt(env.POSTGRES_PORT!),
	host: env.POSTGRES_HOST!,
});

export const db = drizzle(pg, {
	logger: getLogger({ category: 'db' }),
	casing: 'snake_case',
});
