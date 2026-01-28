import { checkPackage, Package } from '@arethetypeswrong/core';
import { versionTable } from '@npm.rest/db/schema';
import { downloadTarball } from './tarball';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { and, eq } from 'drizzle-orm';
import { publint } from 'publint';
import { attw } from './attw';
import {
	type PackumentVersion,
	type Packument,
} from '@npm.rest/validate/packument';

export async function processVersion(pkg: Packument, pkv: PackumentVersion) {
	const exists = await db
		.select({ version: versionTable.version })
		.from(versionTable)
		.where(
			and(
				eq(versionTable.name, pkg.name),
				eq(versionTable.version, pkv.version),
			),
		);

	if (exists.length > 0) {
		// todo confirm what is actually immutable
		await db
			.update(versionTable)
			.set({
				deprecated: pkv.deprecated,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(versionTable.name, pkg.name),
					eq(versionTable.version, pkv.version),
				),
			);

		return Result.ok();
	}

	const tarball = await downloadTarball(pkv.dist.tarball, pkv.dist.integrity);
	if (tarball.isErr()) return tarball;

	const publintResult = await Result.tryPromise(async () => {
		return await publint({
			pkgDir: tarball.value.rootDir,
			pack: { files: tarball.value.files },
		});
	});

	if (publintResult.isErr()) {
		return publintResult;
	}

	const attwResult = await attw(pkg.name, pkv.version, tarball.value);
	if (attwResult.isErr()) return attwResult;

	await db.insert(versionTable).values({
		name: pkg.name,
		version: pkv.version,
		description: pkv.description,
		repoURL: pkv.repository?.url,
		repoDir: pkv.repository?.directory,
		homepage: pkv.homepage,
		deprecated: pkv.deprecated,
		license: pkv.license,
		packedSize: tarball.value.packedSize,
		unpackedSize: tarball.value.unpackedSize,
		publishedAt: pkg.time[pkv.version],
		publint: publintResult.value.messages.length
			? publintResult.value.messages
			: null,
	});

	return Result.ok();
}
