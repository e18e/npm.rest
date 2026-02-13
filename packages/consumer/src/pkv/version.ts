import { version as PUBLINT_VERSION } from '../../node_modules/publint/package.json' with { type: 'json' };
import type { PackumentVersion, Packument } from '@npm.rest/validate/packument';
import { Result, type UnhandledException, type InferErr } from 'better-result';
import { generateId, type ResourceId } from '@npm.rest/db/id';
import { analyzePackageModuleType } from 'node-modules-tools';
import type { PackumentResult } from '../shared/packument';
import { getDependencies } from './dependencies';
import { downloadTarball } from './tarball';
import { and, eq, or } from 'drizzle-orm';
import { db } from '@npm.rest/db/server';
import { getRepository } from './repo';
import { getFunding } from './funding';
import { runPublint } from './publint';
import { hasTypes } from './types';
import {
	versionRepositoryTable,
	versionFundingTable,
	dependencyTable,
	specifierTable,
	publintTable,
	versionTable,
} from '@npm.rest/db/schema';

type ProcessVersionResult = Result<
	void,
	UnhandledException | InferErr<PackumentResult>
>;

export async function processVersion(
	packageId: ResourceId<'pkg'>,
	version: string,
	pkg: Packument,
	pkv: PackumentVersion,
	rev: string,
): Promise<ProcessVersionResult> {
	// sanity check, shouldn't happen
	if (pkv.version && pkv.version !== version) {
		return Result.err(new Error('Version mismatch'));
	}

	const [exists] = await db
		.select({ id: versionTable.id })
		.from(versionTable)
		.where(
			and(
				eq(versionTable.packageId, packageId),
				eq(versionTable.version, version),
			),
		);

	const deprecated =
		typeof pkv.deprecated === 'string'
			? pkv.deprecated
			: pkv.deprecated === true
				? '__no_reason__' // todo is this really best way
				: null;

	if (exists) {
		await db
			.update(versionTable)
			.set({
				deprecated,
				updatedAt: new Date(),
			})
			.where(eq(versionTable.id, exists.id));

		return Result.ok();
	}

	const tarball = await downloadTarball(pkv.dist.tarball, pkv.dist.integrity);
	if (tarball.isErr()) return tarball;

	const publintResult = await runPublint(tarball.value);
	if (publintResult.isErr()) return publintResult;

	const types = await hasTypes(pkg.name, tarball.value, rev);
	if (types.isErr()) return types;

	const repoIds: ResourceId<'repo'>[] = [];

	if (pkv.repository) {
		for (const repo of pkv.repository) {
			const result = await getRepository(repo);
			if (result.isErr()) return result;
			repoIds.push(result.value.id);
		}
	}

	const fundingIds: ResourceId<'fnd'>[] = [];

	if (pkv.funding) {
		for (const funding of pkv.funding) {
			const result = await getFunding(funding);
			if (result.isErr()) return result;
			fundingIds.push(result.value);
		}
	}

	const deps = getDependencies(pkv);
	if (deps.isErr()) return deps;

	await db.transaction(async (tx) => {
		const [record] = await tx
			.insert(versionTable)
			.values({
				id: generateId('pkv'),
				packageId,
				version: version,
				description: pkv.description,
				homepage: pkv.homepage,
				deprecated,
				license:
					typeof pkv.license === 'string'
						? pkv.license
						: pkv.license?.type,
				packedSize: tarball.value.packedSize,
				unpackedSize: tarball.value.unpackedSize,
				publishedAt: pkg.time[version],
				types: types.value,
				moduleType: analyzePackageModuleType(publintResult.value.pkg),
				keywords: pkv.keywords,
			})
			.returning({ id: versionTable.id });

		if (publintResult.value.messages.length > 0) {
			await tx.insert(publintTable).values({
				id: generateId('publ'),
				versionId: record.id,
				messages: publintResult.value.messages,
				publintVersion: PUBLINT_VERSION,
			});
		}

		if (repoIds.length) {
			await tx.insert(versionRepositoryTable).values(
				repoIds.map(
					(id): typeof versionRepositoryTable.$inferInsert => ({
						versionId: record.id,
						repositoryId: id,
					}),
				),
			);
		}

		if (fundingIds.length) {
			await tx.insert(versionFundingTable).values(
				fundingIds.map(
					(id): typeof versionFundingTable.$inferInsert => ({
						versionId: record.id,
						fundingId: id,
					}),
				),
			);
		}

		if (deps.value.length > 0) {
			// Dedupe specs by (name, specifier)
			const uniqueSpecs = new Map(
				deps.value.map((dep) => [
					`${dep.spec.name}@${dep.spec.specifier}`,
					dep.spec,
				]),
			);

			await tx
				.insert(specifierTable)
				.values(
					uniqueSpecs
						.values()
						.map((spec) => ({
							id: generateId('spc'),
							name: spec.name,
							specifier: spec.specifier,
							type: spec.type,
						}))
						.toArray(),
				)
				.onConflictDoNothing();

			// Fetch all spec IDs (existing + newly inserted)
			const specs = await tx
				.select({
					id: specifierTable.id,
					name: specifierTable.name,
					specifier: specifierTable.specifier,
				})
				.from(specifierTable)
				// todo I wish this wasn't - ghostdevv
				.where(
					or(
						...uniqueSpecs
							.values()
							.map((spec) =>
								and(
									eq(specifierTable.name, spec.name),
									eq(
										specifierTable.specifier,
										spec.specifier,
									),
								),
							),
					),
				);

			// Create lookup map
			const specIdMap = new Map(
				specs.map((s) => [`${s.name}@${s.specifier}`, s.id]),
			);

			// Insert version dependencies
			await tx.insert(dependencyTable).values(
				deps.value.map((dep) => ({
					versionId: record.id,
					specifierId: specIdMap.get(
						`${dep.spec.name}@${dep.spec.specifier}`,
					)!,
					type: dep.depType,
					optional: dep.optional,
					alias: dep.alias,
				})),
			);
		}
	});

	return Result.ok();
}
