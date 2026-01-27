import { drizzle } from 'drizzle-orm/postgres-js';
import { getLogger } from '@logtape/drizzle-orm';
import { env } from 'node:process';
import { join } from 'node:path';
import { config } from 'dotenv';

config({ path: join(import.meta.dirname, '../.env') });

export const db = drizzle(env.DATABASE_URL!, {
	logger: getLogger({ category: 'db' }),
});
