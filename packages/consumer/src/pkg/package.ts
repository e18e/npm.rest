import type { Packument } from '@npm.rest/validate/packument';
import { packageTable } from '@npm.rest/db/schema';
import { generateId } from '@npm.rest/db/id';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';

export async function processPackage(packument: Packument, revId: string) {
	const [{ id }] = await db
		.insert(packageTable)
		.values({
			id: generateId('pkg'),
			revId: packument._rev ?? revId,
			name: packument.name,
			distTags: packument['dist-tags'] ?? {},
			createdAt: packument.time.created,
			npmUpdatedAt: packument.time.modified,
		})
		.onConflictDoUpdate({
			target: [packageTable.name],
			set: {
				revId: packument._rev ?? revId,
				distTags: packument['dist-tags'] ?? {},
				npmUpdatedAt: packument.time.modified,
				updatedAt: new Date(),
			},
		})
		.returning({ id: packageTable.id });

	return Result.ok(id);
}
