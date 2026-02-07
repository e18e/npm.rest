import { processPackument } from './shared/packument';
import { processVersion } from './pkv/version';
import { processPackage } from './pkg/package';
import { eq, notExists } from 'drizzle-orm';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import pLimit from 'p-limit';
import {
	type changeTable,
	repositoryTable,
	dependencyTable,
	packumentTable,
	specifierTable,
	packageTable,
	versionTable,
} from '@npm.rest/db/schema';

export async function process(item: typeof changeTable.$inferSelect) {
	if (item.deleted) {
		await db.transaction(async (tx) => {
			// Delete package (cascades to versions, dependencies, and publint)
			await tx
				.delete(packageTable)
				.where(eq(packageTable.name, item.name));

			await tx
				.delete(packumentTable)
				.where(eq(packumentTable.id, item.name));

			// Clean up orphaned specifiers (no longer referenced by any dependency)
			await tx
				.delete(specifierTable)
				.where(
					notExists(
						tx
							.select({ id: dependencyTable.specifierId })
							.from(dependencyTable)
							.where(
								eq(
									dependencyTable.specifierId,
									specifierTable.id,
								),
							),
					),
				);

			// Clean up orphaned repositories (no longer referenced by any version)
			await tx
				.delete(repositoryTable)
				.where(
					notExists(
						tx
							.select({ id: versionTable.id })
							.from(versionTable)
							.where(eq(versionTable.repo, repositoryTable.id)),
					),
				);
		});
	}

	const packument = await processPackument(item.name, item.revId);
	if (packument.isErr()) return packument;

	const packageId = await processPackage(packument.value, item.revId);
	if (packageId.isErr()) return packageId;

	if (packument.value.versions) {
		const limit = pLimit(3);

		// Process N versions in parallel
		const results = await Promise.all(
			Object.values(packument.value.versions).map(async (pkv) => {
				return await limit(async () => {
					return await processVersion(
						packageId.value,
						packument.value,
						pkv,
						item.revId,
					);
				});
			}),
		);

		// Return first error if any version failed
		for (const result of results) {
			if (result.isErr()) {
				return result;
			}
		}
	}

	return Result.ok();
}
