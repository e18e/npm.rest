import '../setup';
import '@npm.rest/test/mock-db';
import { getLicense } from '../../src/pkv/license';
import { licenseTable } from '@npm.rest/db/schema';
import { describe, expect, it } from 'vitest';
import { generateId } from '@npm.rest/db/id';
import { db } from '@npm.rest/db/server';
import { eq } from 'drizzle-orm';

describe('get license', () => {
	it('gets when none exists', async () => {
		const result = await getLicense({ type: 'MIT' });
		const id = result.unwrap();

		const [record] = await db
			.select()
			.from(licenseTable)
			.where(eq(licenseTable.id, id));

		expect(record).toMatchObject({
			id,
			type: 'MIT',
		});
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

		const result = await getLicense({ type: 'MIT' });
		expect(result.unwrap()).toBe(id);
	});
});
