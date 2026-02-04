import type { Packument } from '@npm.rest/validate/packument';
import { packageTable } from '@npm.rest/db/schema';
import { generateId } from '@npm.rest/db/id';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { eq } from 'drizzle-orm';

export async function processPackage(
	packument: Packument,
	revId: string,
	current?: Pick<typeof packageTable.$inferSelect, 'id'>,
) {
	if (current) {
		await db
			.update(packageTable)
			.set({
				distTags: packument['dist-tags'],
				npmUpdatedAt: packument.time.modified,
				updatedAt: new Date(),
			})
			.where(eq(packageTable.id, current.id));

		return Result.ok(current.id);
	}

	const [{ id }] = await db
		.insert(packageTable)
		.values({
			id: generateId('pkg'),
			revId: packument._rev || revId,
			name: packument.name,
			distTags: packument['dist-tags'],
			createdAt: packument.time.created,
			npmUpdatedAt: packument.time.modified,
		})
		.returning({ id: packageTable.id });

	return Result.ok(id);
}
