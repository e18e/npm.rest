import '../setup';
import '@npm.rest/test/mock-db';
import { getLicenses } from '../../src/pkv/license';
import { licenseTable } from '@npm.rest/db/schema';
import { describe, expect, it } from 'vitest';
import { generateId } from '@npm.rest/db/id';
import { db } from '@npm.rest/db/server';
import { inArray } from 'drizzle-orm';

describe('get licenses', () => {
	it('gets when none exists', async () => {
		const result = await getLicenses([{ type: 'MIT' }]);
		const licenses = result.unwrap();

		// oxlint-disable-next-line eslint-plugin-jest(no-conditional-in-test)
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
