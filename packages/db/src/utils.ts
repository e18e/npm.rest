import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { stateTable } from './schema';
import { eq } from 'drizzle-orm';

export function createState<T>(db: PostgresJsDatabase, key: string) {
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
