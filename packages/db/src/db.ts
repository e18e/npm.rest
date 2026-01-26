import { drizzle } from 'drizzle-orm/postgres-js';
import { stateTable } from './schema';
import { env } from 'node:process';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { config } from 'dotenv';

config({ path: join(import.meta.dirname, '../.env') });

export const db = drizzle(env.DATABASE_URL!);

export function createState<T>(key: string) {
	return {
		async get(): Promise<T | null> {
			const [record] = await db
				.select({ value: stateTable.value })
				.from(stateTable)
				.where(eq(stateTable.key, key));

			if (!record) {
				return null;
			}

			return JSON.parse(record.value);
		},
		async set(value: T) {
			await db
				.insert(stateTable)
				.values({ key, value: JSON.stringify(value) })
				.onConflictDoUpdate({
					target: stateTable.key,
					set: { value: JSON.stringify(value) },
				});
		},
	};
}
