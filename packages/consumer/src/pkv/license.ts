import { generateId, type ResourceId } from '@npm.rest/db/id';
import type { License } from '@npm.rest/validate/packument';
import { licenseTable } from '@npm.rest/db/schema';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { LRUCache } from 'lru-cache';

const licenseCache = new LRUCache<string, ResourceId<'lcs'>>({ max: 200 });

export async function getLicense(license: License) {
	const hit = licenseCache.get(license.type);
	if (hit) return Result.ok(hit);

	const [record] = await db
		.insert(licenseTable)
		.values({
			id: generateId('lcs'),
			type: license.type,
		})
		.onConflictDoUpdate({
			target: [licenseTable.type],
			set: { type: license.type },
		})
		.returning({
			id: licenseTable.id,
		});

	if (!record) {
		return Result.err(
			new Error('failed to create/retrieve license record'),
		);
	}

	licenseCache.set(license.type, record.id);
	return Result.ok(record.id);
}
