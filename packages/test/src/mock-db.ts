import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { PGlite } from '@electric-sql/pglite';
import { getTableName } from 'drizzle-orm';
import * as s from '@npm.rest/db/schema';
import { db } from '@npm.rest/db/server';
import { join } from 'node:path';

type RealDB = typeof db;
type MockDB = PgliteDatabase & { $client: PGlite };

vi.mock(import('@npm.rest/db/server'), async () => {
	const { drizzle } = await import('drizzle-orm/pglite');

	// Idea of using pglite from Raphaël Moreau
	// https://github.com/rphlmr/drizzle-vitest-pg/tree/main
	const client = new PGlite();

	return {
		db: drizzle(client, { casing: 'snake_case' }) as unknown as RealDB,
	};
});

function isMockDB(db: unknown): asserts db is MockDB {
	if (
		typeof db === 'object' &&
		db !== null &&
		'$client' in db &&
		db.$client instanceof PGlite
	) {
		return;
	}

	throw new Error('Expected a mock database');
}

// oxlint-disable-next-line vitest/require-top-level-describe
beforeAll(async () => {
	isMockDB(db);

	await migrate(db, {
		migrationsFolder: join(import.meta.dirname, '../../db/.drizzle'),
	});
});

const TABLES = [
	s.stateTable,
	s.packumentTable,
	s.versionRepositoryTable,
	s.repositoryTable,
	s.versionFundingTable,
	s.fundingTable,
	s.versionLicenseTable,
	s.licenseTable,
	s.changeTable,
	s.packageTable,
	s.versionTable,
	s.specifierTable,
	s.dependencyTable,
	s.publintTable,
];

// oxlint-disable-next-line vitest/require-top-level-describe
afterEach(async () => {
	isMockDB(db);

	for (const table of TABLES) {
		await db.delete(table);
	}
});

// oxlint-disable-next-line vitest/require-top-level-describe
afterAll(async () => {
	isMockDB(db);
	await db.$client.close();
});

export async function databaseSnapshot() {
	isMockDB(db);

	const tableData = await Promise.all(
		TABLES.map(
			async (table): Promise<[table: string, rows: unknown[]]> => [
				getTableName(table),
				await db.select().from(table),
			],
		),
	);

	return Object.fromEntries(tableData.filter(([, data]) => data.length > 0));
}
