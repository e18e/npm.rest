import '../setup';
import '@npm.rest/test/mock-db';
import { getFunding } from '../../src/pkv/funding';
import { fundingTable } from '@npm.rest/db/schema';
import { describe, expect, it } from 'vitest';
import { generateId } from '@npm.rest/db/id';
import { db } from '@npm.rest/db/server';
import { eq } from 'drizzle-orm';

describe('get funding', () => {
	it('gets when none exists', async () => {
		const result = await getFunding({
			type: 'open-collective',
			url: 'https://opencollective.com/e18e',
		});

		const id = result.unwrap();

		const [record] = await db
			.select()
			.from(fundingTable)
			.where(eq(fundingTable.id, id));

		expect(record).toMatchObject({
			id,
			type: 'open-collective',
			url: 'https://opencollective.com/e18e',
		});
	});

	it('returns id when exists', async () => {
		const id = generateId('fnd');

		const [record] = await db
			.insert(fundingTable)
			.values({
				id,
				type: 'open-collective',
				url: 'https://opencollective.com/e18e',
			})
			.returning({ id: fundingTable.id });

		expect(record).toMatchObject({ id });

		const result = await getFunding({
			type: 'open-collective',
			url: 'https://opencollective.com/e18e',
		});

		expect(result.unwrap()).toBe(id);
	});
});
