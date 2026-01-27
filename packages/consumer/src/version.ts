import { checkPackage, Package } from '@arethetypeswrong/core';
import { versionTable } from '@npm.rest/db/schema';
import { downloadTarball } from './tarball';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { and, eq } from 'drizzle-orm';
import { publint } from 'publint';
import { join } from 'node:path';
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

	const files = await downloadTarball(pkv.dist);
	if (files.isErr()) return files;

	const publintResult = await Result.tryPromise(async () => {
		return await publint({
			pkgDir: files.value.rootDir,
			pack: { files: files.value.files },
		});
	});

	if (publintResult.isErr()) {
		return publintResult;
	}

	const attw = await Result.tryPromise(async () => {
		const mappedFiles = Object.fromEntries(
			files.value.files.map((file) => [
				join(
					'/node_modules',
					'create-ghost',
					file.name.startsWith(files.value.rootDir)
						? file.name.slice(files.value.rootDir.length)
						: file.name,
				),
				file.data,
			]),
		);

		return await checkPackage(
			new Package(mappedFiles, pkg.name, pkv.version),
		);
	});

	if (attw.isErr()) {
		return attw;
	}

	await db.insert(versionTable).values({
		name: pkg.name,
		version: pkv.version,
		description: pkv.description,
		repoURL: pkv.repository?.url,
		repoDir: pkv.repository?.directory,
		homepage: pkv.homepage,
		deprecated: pkv.deprecated,
		license: pkv.license,
		packedSize: files.value.packedSize,
		unpackedSize: files.value.unpackedSize,
		publishedAt: pkg.time[pkv.version],
		publint: publintResult.value.messages.length
			? publintResult.value.messages
			: null,
	});

	return Result.ok();
}
