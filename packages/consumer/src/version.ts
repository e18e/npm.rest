import { publintTable, versionTable } from '@npm.rest/db/schema';
import { generateId, type ResourceId } from '@npm.rest/db/id';
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

const { version: publintVersion } =
	await import('../node_modules/publint/package.json');

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

	const attwResult = await attw(pkg.name, pkv.version, tarball.value);
	if (attwResult.isErr()) return attwResult;

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
			types: attwResult.value.types
				? attwResult.value.types.kind === '@types'
					? 'definitely-typed'
					: 'built-in'
				: 'none',
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
