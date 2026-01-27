import { type Packument } from '@npm.rest/validate/packument';
import { packageTable } from '@npm.rest/db/schema';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';

export async function processPackage(packument: Packument) {
	await db
		.insert(packageTable)
		.values({
			name: packument.name,
			distTags: packument['dist-tags'],
			createdAt: packument.time.created,
			npmUpdatedAt: packument.time.modified,
		})
		.onConflictDoUpdate({
			target: [packageTable.name],
			set: {
				distTags: packument['dist-tags'],
				npmUpdatedAt: packument.time.modified,
				updatedAt: new Date(),
			},
		});

	return Result.ok();
}
