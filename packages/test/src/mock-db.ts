import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { PGlite } from '@electric-sql/pglite';
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

// oxlint-disable-next-line vitest(require-top-level-describe)
beforeAll(async () => {
	isMockDB(db);

	await migrate(db, {
		migrationsFolder: join(import.meta.dirname, '../../db/.drizzle'),
	});
});

// oxlint-disable-next-line vitest(require-top-level-describe)
afterEach(async () => {
	isMockDB(db);
	await db.delete(s.stateTable);
	await db.delete(s.packumentTable);
	await db.delete(s.versionRepositoryTable);
	await db.delete(s.repositoryTable);
	await db.delete(s.fundingTable);
	await db.delete(s.versionFundingTable);
	await db.delete(s.licenseTable);
	await db.delete(s.versionLicenseTable);
	await db.delete(s.changeTable);
	await db.delete(s.packageTable);
	await db.delete(s.versionTable);
	await db.delete(s.specifierTable);
	await db.delete(s.dependencyTable);
	await db.delete(s.publintTable);
});

// oxlint-disable-next-line vitest(require-top-level-describe)
afterAll(async () => {
	isMockDB(db);
	await db.$client.close();
});
