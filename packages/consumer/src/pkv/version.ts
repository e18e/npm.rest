import { version as PUBLINT_VERSION } from '../../node_modules/publint/package.json' with { type: 'json' };
import { generateId, type ResourceId } from '@npm.rest/db/id';
import { analyzePackageModuleType } from './module-type';
import { getDependencies } from './dependencies';
import { downloadTarball } from './tarball';
import hostedGitInfo from 'hosted-git-info';
import { db } from '@npm.rest/db/server';
import { runPublint } from './publint';
import { getRepository } from './repo';
import { Result } from 'better-result';
import { and, eq } from 'drizzle-orm';
import { hasTypes } from './types';
import {
	type PackumentVersion,
	type Packument,
} from '@npm.rest/validate/packument';
import {
	dependencyTable,
	publintTable,
	versionTable,
} from '@npm.rest/db/schema';

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
		// todo unpublish, maintainers, contributors
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

	const publintResult = await runPublint(tarball.value);
	if (publintResult.isErr()) return publintResult;

	const types = await hasTypes(pkg.name, tarball.value);
	if (types.isErr()) return types;

	const repoInfo = pkv.repository
		? hostedGitInfo.fromUrl(pkv.repository.url)
		: null;

	const repo = repoInfo ? await getRepository(repoInfo) : null;
	if (repo?.isErr()) return repo;

	const deps = getDependencies(pkv);
	if (deps.isErr()) return deps;

	await db.transaction(async (tx) => {
		const [record] = await tx
			.insert(versionTable)
			.values({
				id: generateId('pkv'),
				packageId,
				version: pkv.version,
				description: pkv.description,
				homepage: pkv.homepage,
				deprecated: pkv.deprecated,
				license: pkv.license,
				packedSize: tarball.value.packedSize,
				unpackedSize: tarball.value.unpackedSize,
				publishedAt: pkg.time[pkv.version],
				types: types.value,
				moduleType: analyzePackageModuleType(publintResult.value.pkg),
				keywords: pkv.keywords,
				repo: repo?.unwrapOr(null)?.id,
				repoDirectory: pkv.repository?.directory,
				repoBranch: repoInfo?.treepath,
			})
			.returning({ id: versionTable.id });

		await tx.insert(publintTable).values({
			id: generateId('publ'),
			versionId: record.id,
			messages: publintResult.value.messages,
			publintVersion: PUBLINT_VERSION,
		});

		await tx.insert(dependencyTable).values(
			deps.value.map((dep): typeof dependencyTable.$inferInsert => ({
				id: generateId('dep'),
				name: dep.name,
				type: dep.type,
				specifier: dep.specifier,
				optional: dep.optional,
				fromVersionId: record.id,
			})),
		);
	});

	return Result.ok();
}
