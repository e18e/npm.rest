import { publintTable, versionTable } from '@npm.rest/db/schema';
import { generateId, type ResourceId } from '@npm.rest/db/id';
import { analyzePackageModuleType } from './module-type';
import type { UnpackResult } from '@publint/pack';
import { processPackument } from './packument';
import { downloadTarball } from './tarball';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { and, eq } from 'drizzle-orm';
import { extname } from 'node:path';
import { publint } from 'publint';
import {
	type PackumentVersion,
	type Packument,
} from '@npm.rest/validate/packument';

const { version: publintVersion } =
	await import('../node_modules/publint/package.json');

const TS_FILE_EXTENSIONS = ['.ts', '.cts', '.mts', '.tsx'];

async function hasTypes(name: string, tarball: UnpackResult) {
	if (name.startsWith('@types/')) {
		return Result.ok('built-in' as const);
	}

	const containsTypes = tarball.files.some((file) =>
		TS_FILE_EXTENSIONS.includes(extname(file.name)),
	);

	if (containsTypes) {
		return Result.ok('built-in' as const);
	}

	const pkg = await processPackument(
		name.startsWith('@')
			? name.replace('/', '__').replace('@', '@types/')
			: `@types/${name}`,
	);

	if (pkg.isErr()) {
		if ('status' in pkg.error && pkg.error.status === 404) {
			return Result.ok('none' as const);
		}

		return pkg;
	}

	return Result.ok('definitely-typed' as const);
}

export async function processVersion(
	packageId: ResourceId<'pkg'>,
	pkg: Packument,
	pkv: PackumentVersion,
) {
	const [exists] = await db
		.select({ id: versionTable.id })
		.from(versionTable)
		.where(
			and(
				eq(versionTable.packageId, packageId),
				eq(versionTable.version, pkv.version),
			),
		);

	if (exists) {
		// todo confirm what is actually immutable
		// todo check if publint exists else process
		await db
			.update(versionTable)
			.set({
				deprecated: pkv.deprecated,
				updatedAt: new Date(),
			})
			.where(eq(versionTable.id, exists.id));

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

	const types = await hasTypes(pkg.name, tarball.value);
	if (types.isErr()) return types;

	const [record] = await db
		.insert(versionTable)
		.values({
			id: generateId('pkv'),
			packageId,
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
			types: types.value,
			moduleType: analyzePackageModuleType(publintResult.value.pkg),
			keywords: pkv.keywords,
		})
		.returning({ id: versionTable.id });

	await db.insert(publintTable).values({
		id: generateId('publ'),
		versionId: record.id,
		messages: publintResult.value.messages,
		publintVersion,
	});

	return Result.ok();
}
