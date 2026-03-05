import { fundingTable, versionFundingTable } from '@npm.rest/db/schema';
import { generateId, type ResourceId } from '@npm.rest/db/id';
import type { Funding } from '@npm.rest/validate/packument';
import { and, eq, inArray, notExists } from 'drizzle-orm';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { LRUCache } from 'lru-cache';

export type DatabaseFunding = Pick<
	typeof fundingTable.$inferSelect,
	'id' | 'url'
>[];

const fundingCache = new LRUCache<string, ResourceId<'fnd'>>({ max: 200 });

export async function getFunding(pkvFunding?: Funding[] | null) {
	if (!pkvFunding?.length) return Result.ok(null);

	const fundings: DatabaseFunding = [];

	for (const funding of pkvFunding) {
		const hit = fundingCache.get(funding.url);

		if (hit) {
			fundings.push({ id: hit, url: funding.url });
			continue;
		}

		const [record] = await db
			.insert(fundingTable)
			.values({
				id: generateId('fnd'),
				type: funding.type,
				url: funding.url,
			})
			.onConflictDoUpdate({
				target: [fundingTable.type, fundingTable.url],
				set: { type: funding.type, url: funding.url },
			})
			.returning({
				id: fundingTable.id,
			});

		if (!record) {
			return Result.err(
				new Error('failed to create/retrieve funding record'),
			);
		}

		fundingCache.set(funding.url, record.id);
		fundings.push({ id: record.id, url: funding.url });
	}

	return Result.ok(fundings);
}

export async function updateFunding(
	tx: Omit<typeof db, '$client'>,
	versionId: ResourceId<'pkv'>,
	next: DatabaseFunding,
	current?: DatabaseFunding,
) {
	// Get the ids of the new (next) group of funding
	const nextIds = new Set(next.map((funding) => funding.id));

	// Get the ids of any currently stored funding for this version (if any)
	const currentIds = new Set(current?.map((funding) => funding.id));

	// Work out what is missing from the current set
	const newFunding = nextIds.difference(currentIds);

	if (newFunding.size) {
		// Insert the new link between the funding and version
		await tx.insert(versionFundingTable).values(
			newFunding
				.values()
				.map((fundingId) => ({
					versionId,
					fundingId,
				}))
				.toArray(),
		);
	}

	// Work out what, if any, funding is no longer present
	// Ordinarily this shouldn't happen, since a packument version is
	// fixed. However, if the way that we parse funding changes, say a
	// new normalisation it could cause stale funding to be present.
	const removedFunding = currentIds.difference(nextIds);

	if (removedFunding.size) {
		// Remove the old link between the version and funding
		await tx
			.delete(versionFundingTable)
			.where(
				and(
					eq(versionFundingTable.versionId, versionId),
					inArray(
						versionFundingTable.fundingId,
						removedFunding.values().toArray(),
					),
				),
			);

		// Cleanup any funding that are no longer linked to by any
		// versions. Only look for links on the funding we just removed.
		await tx
			.delete(fundingTable)
			.where(
				and(
					inArray(fundingTable.id, removedFunding.values().toArray()),
					notExists(
						tx
							.select({})
							.from(versionFundingTable)
							.where(
								eq(
									versionFundingTable.fundingId,
									fundingTable.id,
								),
							),
					),
				),
			);
	}
}
