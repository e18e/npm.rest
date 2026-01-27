import { packumentTable } from '@npm.rest/db/schema';
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
		.select({ id: packumentTable.id, revId: packumentTable.revId })
		.from(packumentTable)
		.where(eq(packumentTable.id, name));

	if (exists?.revId && revGreater(exists.revId, rev)) {
		logger.debug(`skipped ${name} since existing rev is greater`, {
			pkg: name,
			currentRev: exists.revId,
			newRev: rev,
		});

		return Result.ok();
	}

	return await Result.gen(async function* () {
		const packu = yield* Result.await(processPackument(name));

		yield* Result.await(processPackage(packu));

		if (packu.versions) {
			for (const ver of Object.values(packu.versions)) {
				yield* Result.await(processVersion(packu, ver));
			}
		}

		return Result.ok();
	});
}
