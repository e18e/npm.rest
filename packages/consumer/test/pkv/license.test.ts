import '../setup';
import '@npm.rest/test/mock-db';
import { licenseTable, versionLicenseTable } from '@npm.rest/db/schema';
import { getLicenses } from '../../src/pkv/license';
import { describe, expect, it } from 'vitest';
import { generateId } from '@npm.rest/db/id';
import { db } from '@npm.rest/db/server';
import { eq, inArray } from 'drizzle-orm';
import { insert } from '../utils';
import {
	createPackumentVersion,
	createPackument,
} from '@npm.rest/test/packument';

describe('get licenses', () => {
	it('gets when none exists', async () => {
		const result = await getLicenses([{ type: 'MIT' }]);
		const licenses = result.unwrap();

		// oxlint-disable-next-line eslint-plugin-jest/no-conditional-in-test
		const ids = licenses?.map((license) => license.id) ?? [];

		const records = await db
			.select()
			.from(licenseTable)
			.where(inArray(licenseTable.id, ids));

		expect(records).toMatchObject([{ id: ids[0], type: 'MIT' }]);
	});

	it('returns id when exists', async () => {
		const id = generateId('lcs');

		const [record] = await db
			.insert(licenseTable)
			.values({
				id,
				type: 'MIT',
			})
			.returning({ id: licenseTable.id });

		expect(record).toMatchObject({ id });

		const result = await getLicenses([{ type: 'MIT' }]);
		expect(result.unwrap()).toMatchObject([{ id, type: 'MIT' }]);
	});
});

describe('update licenses', () => {
	it('updates licenses that change', async () => {
		const pkv = createPackumentVersion('1.0.0');
		pkv.license = [
			{ type: 'MIT' },
			{ type: 'ISC' },
			{ type: 'Apache-2.0' },
		];

		const pkg = createPackument([pkv]);
		const insertion = await insert(pkg);

		const initial = await db
			.select({ type: licenseTable.type, licenseId: licenseTable.id })
			.from(versionLicenseTable)
			.where(eq(versionLicenseTable.versionId, insertion.pkvIds[0]))
			.leftJoin(
				licenseTable,
				eq(licenseTable.id, versionLicenseTable.licenseId),
			);

		const mitLicenseId = initial.find((l) => l.type === 'MIT')?.licenseId;

		expect(initial).toHaveLength(3);
		expect(initial).toMatchObject([
			{ type: 'MIT', licenseId: mitLicenseId },
			{ type: 'ISC' },
			{ type: 'Apache-2.0' },
		]);

		pkv.license = [{ type: 'MIT' }, { type: 'bar' }, { type: 'mit' }];
		const updatedPkg = await insert(pkg);
		expect(updatedPkg).toMatchObject(insertion);

		const updatedLicenses = await db
			.select({ type: licenseTable.type, licenseId: licenseTable.id })
			.from(versionLicenseTable)
			.where(eq(versionLicenseTable.versionId, insertion.pkvIds[0]))
			.leftJoin(
				licenseTable,
				eq(licenseTable.id, versionLicenseTable.licenseId),
			);

		expect(updatedLicenses).toHaveLength(3);
		expect(updatedLicenses).toMatchObject([
			{ type: 'MIT', licenseId: mitLicenseId },
			{ type: 'bar' },
			{ type: 'mit' },
		]);

		const allLicenses = await db.select().from(licenseTable);
		// oxlint-disable-next-line eslint-plugin-jest/max-expects
		expect(allLicenses).toHaveLength(3);
	});
});
