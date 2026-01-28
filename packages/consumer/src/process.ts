import { packageTable } from '@npm.rest/db/schema';
import { processPackument } from './packument';
import { processVersion } from './version';
import { processPackage } from './package';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { eq } from 'drizzle-orm';
import { logger } from './main';

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

	return await Result.gen(async function* () {
		const packument = yield* Result.await(processPackument(name, rev));

		const packageId = yield* Result.await(
			processPackage(packument, rev, exists),
		);

		if (packument.versions) {
			for (const pkv of Object.values(packument.versions)) {
				yield* Result.await(processVersion(packageId, packument, pkv));
			}
		}

		return Result.ok();
	});
}
