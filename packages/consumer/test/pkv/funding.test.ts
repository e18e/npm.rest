import '../setup';
import '@npm.rest/test/mock-db';
import { fundingTable, versionFundingTable } from '@npm.rest/db/schema';
import { getFunding } from '../../src/pkv/funding';
import { describe, expect, it } from 'vitest';
import { generateId } from '@npm.rest/db/id';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@npm.rest/db/server';
import { insert } from '../utils';
import {
	createPackument,
	createPackumentVersion,
} from '@npm.rest/test/packument';

describe('get funding', () => {
	it('gets when none exists', async () => {
		const result = await getFunding([
			{
				type: 'open-collective',
				url: 'https://opencollective.com/e18e',
			},
		]);

		const funding = result.unwrap();
		// oxlint-disable-next-line eslint-plugin-jest(no-conditional-in-test)
		const ids = funding?.map((funding) => funding.id) ?? [];

		const records = await db
			.select()
			.from(fundingTable)
			.where(inArray(fundingTable.id, ids));

		expect(records).toHaveLength(1);
		expect(records).toMatchObject([
			{
				id: ids[0],
				type: 'open-collective',
				url: 'https://opencollective.com/e18e',
			},
		]);
	});

	it('returns id when exists', async () => {
		const id = generateId('fnd');

		const records = await db
			.insert(fundingTable)
			.values({
				id,
				type: 'open-collective',
				url: 'https://opencollective.com/e18e',
			})
			.returning({ id: fundingTable.id, url: fundingTable.url });

		expect(records).toHaveLength(1);
		expect(records).toMatchObject([{ id }]);

		const result = await getFunding([
			{
				type: 'open-collective',
				url: 'https://opencollective.com/e18e',
			},
		]);

		expect(result.unwrap()).toMatchObject(records);
	});
});

describe('update licenses', () => {
	it('updates licenses that change', async () => {
		const pkv = createPackumentVersion('1.0.0');
		pkv.funding = [
			{ type: 'open-collective', url: 'https://opencollective.com/e18e' },
			{ type: 'github', url: 'https://github.com/sponsors/e18e' },
			{ type: 'unknown', url: 'https://example.com' },
		];

		const pkg = createPackument([pkv]);
		const insertion = await insert(pkg);

		const initial = await db
			.select({
				fundingId: fundingTable.id,
				type: fundingTable.type,
				url: fundingTable.url,
			})
			.from(versionFundingTable)
			.where(eq(versionFundingTable.versionId, insertion.pkvIds[0]))
			.leftJoin(
				fundingTable,
				eq(fundingTable.id, versionFundingTable.fundingId),
			);

		const ocFundingId = initial.find(
			(l) => l.type === 'open-collective',
		)?.fundingId;

		expect(initial).toHaveLength(3);
		expect(initial).toMatchObject([
			{
				type: 'open-collective',
				url: 'https://opencollective.com/e18e',
				fundingId: ocFundingId,
			},
			{ type: 'github', url: 'https://github.com/sponsors/e18e' },
			{ type: 'unknown', url: 'https://example.com' },
		]);

		pkv.funding = [
			{ type: 'open-collective', url: 'https://opencollective.com/e18e' },
			{ type: 'unknown', url: 'https://foo.com' },
			{ type: 'ko-fi', url: 'https://ko-fi.com' },
		];

		const updatedPkg = await insert(pkg);
		expect(updatedPkg).toMatchObject(insertion);

		const updatedFunding = await db
			.select({
				fundingId: fundingTable.id,
				type: fundingTable.type,
				url: fundingTable.url,
			})
			.from(versionFundingTable)
			.where(eq(versionFundingTable.versionId, insertion.pkvIds[0]))
			.leftJoin(
				fundingTable,
				eq(fundingTable.id, versionFundingTable.fundingId),
			);

		expect(updatedFunding).toHaveLength(3);
		expect(updatedFunding).toMatchObject([
			{
				type: 'open-collective',
				url: 'https://opencollective.com/e18e',
				fundingId: ocFundingId,
			},
			{ type: 'unknown', url: 'https://foo.com' },
			{ type: 'ko-fi', url: 'https://ko-fi.com' },
		]);

		const allFunding = await db.select().from(fundingTable);
		// oxlint-disable-next-line eslint-plugin-jest(max-expects)
		expect(allFunding).toHaveLength(3);
	});
});
