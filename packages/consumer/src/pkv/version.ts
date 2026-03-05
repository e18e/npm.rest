import { version as PUBLINT_VERSION } from '../../node_modules/publint/package.json' with { type: 'json' };
import type { PackumentVersion, Packument } from '@npm.rest/validate/packument';
import { Result, type UnhandledException, type InferErr } from 'better-result';
import { generateId, type ResourceId } from '@npm.rest/db/id';
import { analyzePackageModuleType } from 'node-modules-tools';
import { getRepositories, updateRepositories } from './repo';
import type { PackumentResult } from '../shared/packument';
import { getLicenses, updateLicenses } from './license';
import { getExistingVersion } from './existing-version';
import { getFunding, updateFunding } from './funding';
import { getDependencies } from './dependencies';
import { formatDeprecated } from './deprecated';
import { downloadTarball } from './tarball';
import { and, eq, or } from 'drizzle-orm';
import { db } from '@npm.rest/db/server';
import { runPublint } from './publint';
import { hasTypes } from './types';
import {
	dependencyTable,
	specifierTable,
	publintTable,
	versionTable,
} from '@npm.rest/db/schema';

type ProcessVersionResult = Result<
	ResourceId<'pkv'>,
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

	const exists = await getExistingVersion(packageId, version);

	const licenses = await getLicenses(pkv.license);
	if (licenses.isErr()) return licenses;

	const funding = await getFunding(pkv.funding);
	if (funding.isErr()) return funding;

	const repo = await getRepositories(pkv.repository);
	if (repo.isErr()) return repo;

	if (exists) {
		await db.transaction(async (tx) => {
			await tx
				.update(versionTable)
				.set({
					deprecated: formatDeprecated(pkv),
					updatedAt: new Date(),
				})
				.where(eq(versionTable.id, exists.id));

			if (licenses.value) {
				await updateLicenses(
					tx,
					exists.id,
					licenses.value,
					exists.licenses,
				);
			}

			if (funding.value) {
				await updateFunding(
					tx,
					exists.id,
					funding.value,
					exists.funding,
				);
			}

			if (repo.value) {
				await updateRepositories(
					tx,
					exists.id,
					repo.value,
					exists.repository,
				);
			}
		});

		return Result.ok(exists.id);
	}

	const tarball = await downloadTarball(pkv.dist.tarball, pkv.dist.integrity);
	if (tarball.isErr()) return tarball;

	const publintResult = await runPublint(tarball.value);
	if (publintResult.isErr()) return publintResult;

	const types = await hasTypes(pkg.name, tarball.value, rev);
	if (types.isErr()) return types;

	const deps = getDependencies(pkv);
	if (deps.isErr()) return deps;

	const pkvId = await db.transaction(async (tx) => {
		const [record] = await tx
			.insert(versionTable)
			.values({
				id: generateId('pkv'),
				packageId,
				version: version,
				description: pkv.description,
				homepage: pkv.homepage,
				deprecated: formatDeprecated(pkv),
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

		if (repo.value) {
			await updateRepositories(tx, record.id, repo.value);
		}

		if (funding.value) {
			await updateFunding(tx, record.id, funding.value);
		}

		if (licenses.value) {
			await updateLicenses(tx, record.id, licenses.value);
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

		return record.id;
	});

	return Result.ok(pkvId);
}
