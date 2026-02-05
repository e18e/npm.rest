import { processPackument } from './shared/packument';
import { packageTable } from '@npm.rest/db/schema';
import { processVersion } from './pkv/version';
import { processPackage } from './pkg/package';
import { logger } from './shared/logger';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { eq } from 'drizzle-orm';
import pLimit from 'p-limit';

function revGreater(a: string, b: string) {
	if (a === b) return false;
	const aNum = Number.parseInt(a.split('-')[1]);
	const bNum = Number.parseInt(b.split('-')[1]);
	return aNum > bNum;
}

export async function process(name: string, rev: string) {
	const [exists] = await db
		.select({ id: packageTable.id, revId: packageTable.revId })
		.from(packageTable)
		.where(eq(packageTable.name, name));

	// todo this assumption may fall apart if a queue item fails
	if (exists?.revId && revGreater(exists.revId, rev)) {
		logger.debug(`skipped ${name} since existing rev is greater`, {
			pkg: name,
			currentRev: exists.revId,
			newRev: rev,
		});

		return Result.ok();
	}

	const packument = await processPackument(name, rev);
	if (packument.isErr()) return packument;

	const packageId = await processPackage(packument.value, rev, exists);
	if (packageId.isErr()) return packageId;

	if (packument.value.versions) {
		const limit = pLimit(3);

		// Process N versions in parallel
		const results = await Promise.all(
			Object.values(packument.value.versions).map((pkv) =>
				limit(async () => {
					return await processVersion(
						packageId.value,
						packument.value,
						pkv,
					);
				}),
			),
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
