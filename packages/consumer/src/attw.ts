import type { UnpackResult } from '@publint/pack';
import { downloadTarball } from './tarball';
import { Result } from 'better-result';
import { join } from 'node:path';
import * as v from 'valibot';
import {
	resolveImplementationPackageForTypesPackage,
	resolveTypesPackageForPackage,
	checkPackage,
	Package,
} from '@arethetypeswrong/core';

// todo the attw resolve fns I'm using fetch packuments,
// can this be optimised?

/**
 * Fetch the tarball for the implementation package from the types package.
 * @param name - types package name
 * @param version - types package version
 */
async function fetchTarballForImplFromTypes(name: string, version: string) {
	return await Result.gen(async function* () {
		const { tarballUrl } = yield* Result.await(
			Result.tryPromise(() =>
				resolveImplementationPackageForTypesPackage(name, version),
			),
		);

		const tarball = yield* Result.await(downloadTarball(tarballUrl));

		return Result.ok(tarball);
	});
}

/**
 * Fetch the tarball for the types package from the implementation package.
 * @param name - implementation package name
 * @param version - implementation package version
 * @returns
 */
async function fetchTarballForTypesFromImpl(name: string, version: string) {
	return await Result.gen(async function* () {
		const result = yield* Result.await(
			Result.tryPromise(() =>
				resolveTypesPackageForPackage(name, version),
			),
		);

		if (!result) {
			return Result.ok(null);
		}

		const tarball = yield* Result.await(downloadTarball(result.tarballUrl));

		return Result.ok(tarball);
	});
}

const ManifestSchema = v.object({
	name: v.string(),
	version: v.string(),
});

/**
 * Convert a tarball ({@link UnpackResult}) to a attw package ({@link Package})
 */
function tarballToPackage(tarball: UnpackResult) {
	const file = tarball.files.find(
		(file) => file.name == join(tarball.rootDir, 'package.json'),
	);

	if (!file) {
		return Result.err(new Error('manifest file not found in tarball'));
	}

	const manifest = Result.try(() => {
		const raw = JSON.parse(new TextDecoder().decode(file.data));
		return v.parse(ManifestSchema, raw);
	});

	if (manifest.isErr()) {
		return manifest;
	}

	// Convert the publint unpack result to the attw one
	const mappedFiles = Object.fromEntries(
		tarball.files.map((file) => [
			join(
				'/node_modules',
				manifest.value.name,
				file.name.startsWith(tarball.rootDir)
					? file.name.slice(tarball.rootDir.length)
					: file.name,
			),
			file.data,
		]),
	);

	const pkg = new Package(
		mappedFiles,
		manifest.value.name,
		manifest.value.version,
	);

	return Result.ok(pkg);
}

export async function attw(
	name: string,
	version: string,
	tarball: UnpackResult,
) {
	// Based on MIT Licensed code by Andrew Branch
	// https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/161725ad2e8957f109e44fb26b13c9d70f415c2f/packages/core/src/createPackage.ts#L101-L140
	// https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/161725ad2e8957f109e44fb26b13c9d70f415c2f/packages/web/worker/worker.ts#L40-L44
	const pkg = await Result.gen(async function* () {
		// We need the data from the "implementation" of the package,
		// e.g. for `@types/semver` the implementation package is `semver`
		const implTarball = yield* name.startsWith('@types/')
			? Result.await(fetchTarballForImplFromTypes(name, version))
			: Result.ok(tarball);

		const pkg = yield* tarballToPackage(implTarball);

		if (pkg.containsTypes()) {
			return Result.ok(pkg);
		}

		// Now if the package doesn't contain built-in types, we
		// can fetch the types package (if it exists).
		const typesTarball = yield* name.startsWith('@types/')
			? Result.ok(tarball)
			: Result.await(fetchTarballForTypesFromImpl(name, version));

		if (!typesTarball) {
			return Result.ok(pkg);
		}

		const typesPkg = yield* tarballToPackage(typesTarball);
		return Result.ok(pkg.mergedWithTypes(typesPkg));
	});

	if (pkg.isErr()) {
		return pkg;
	}

	const result = await Result.tryPromise(() => checkPackage(pkg.value));
	if (result.isErr()) return result;

	return Result.ok(result.value);
}
