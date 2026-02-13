import { generateId, type ResourceId } from '@npm.rest/db/id';
import type { Funding } from '@npm.rest/validate/packument';
import { fundingTable } from '@npm.rest/db/schema';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { LRUCache } from 'lru-cache';

const fundingCache = new LRUCache<string, ResourceId<'fnd'>>({ max: 200 });

export async function getFunding(funding: Funding) {
	const hit = fundingCache.get(funding.url);
	if (hit) return Result.ok(hit);

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
	return Result.ok(record.id);
}
