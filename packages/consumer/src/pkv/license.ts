import { licenseTable, versionLicenseTable } from '@npm.rest/db/schema';
import { generateId, type ResourceId } from '@npm.rest/db/id';
import type { License } from '@npm.rest/validate/packument';
import { and, eq, inArray, notExists } from 'drizzle-orm';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { LRUCache } from 'lru-cache';

export type DatabaseLicenses = Pick<
	typeof licenseTable.$inferSelect,
	'id' | 'type'
>[];

const licenseCache = new LRUCache<string, ResourceId<'lcs'>>({ max: 200 });

export async function getLicenses(pkvLicenses: License[] | null) {
	if (!pkvLicenses?.length) return Result.ok(null);

	const licenses: DatabaseLicenses = [];

	for (const { type } of pkvLicenses) {
		const hit = licenseCache.get(type);

		if (hit) {
			licenses.push({ id: hit, type });
			continue;
		}

		const [record] = await db
			.insert(licenseTable)
			.values({
				id: generateId('lcs'),
				type,
			})
			.onConflictDoUpdate({
				target: [licenseTable.type],
				set: { type },
			})
			.returning({
				id: licenseTable.id,
			});

		if (!record) {
			return Result.err(
				new Error('failed to create/retrieve license record'),
			);
		}

		licenseCache.set(type, record.id);
		licenses.push({ id: record.id, type });
	}

	return Result.ok(licenses);
}

export async function updateLicenses(
	tx: Omit<typeof db, '$client'>,
	versionId: ResourceId<'pkv'>,
	next: DatabaseLicenses,
	current?: DatabaseLicenses,
) {
	// Get the ids of the new (next) group of licenses
	const nextIds = new Set(next.map((license) => license.id));

	// Get the ids of any currently stored licenses for this version (if any)
	const currentIds = new Set(current?.map((license) => license.id));

	// Work out what is missing from the current set
	const newLicenses = nextIds.difference(currentIds);

	if (newLicenses.size) {
		// Insert the new link between the license and version
		await tx.insert(versionLicenseTable).values(
			newLicenses
				.values()
				.map((licenseId) => ({
					versionId,
					licenseId,
				}))
				.toArray(),
		);
	}

	// Work out what, if any, licenses are no longer present
	// Ordinarily this shouldn't happen, since a packument version is
	// fixed. However, if the way that we parse licenses changes, say a
	// new normalisation it could cause stale licenses to be present.
	const removedLicenses = currentIds.difference(nextIds);

	if (removedLicenses.size) {
		// Remove the old link between the version and license
		await tx
			.delete(versionLicenseTable)
			.where(
				and(
					eq(versionLicenseTable.versionId, versionId),
					inArray(
						versionLicenseTable.licenseId,
						removedLicenses.values().toArray(),
					),
				),
			);

		// Cleanup any licenses that are no longer linked to by any
		// versions. Only look for links on the licenses we just removed.
		await tx
			.delete(licenseTable)
			.where(
				and(
					inArray(
						licenseTable.id,
						removedLicenses.values().toArray(),
					),
					notExists(
						tx
							.select({})
							.from(versionLicenseTable)
							.where(
								eq(
									versionLicenseTable.licenseId,
									licenseTable.id,
								),
							),
					),
				),
			);
	}
}
