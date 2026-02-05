import { processPackument } from '../shared/packument';
import { packageTable } from '@npm.rest/db/schema';
import type { UnpackResult } from '@publint/pack';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { LRUCache } from 'lru-cache';
import { extname } from 'node:path';
import { eq } from 'drizzle-orm';

const TS_FILE_EXTENSIONS = ['.ts', '.cts', '.mts', '.tsx'];

export async function hasTypes(
	name: string,
	tarball: UnpackResult,
	rev: string,
) {
	if (name.startsWith('@types/')) {
		return Result.ok('built-in' as const);
	}

	const containsTypes = tarball.files.some((file) =>
		TS_FILE_EXTENSIONS.includes(extname(file.name)),
	);

	if (containsTypes) {
		return Result.ok('built-in' as const);
	}

	const typesPkgName = name.startsWith('@')
		? name.replace('/', '__').replace('@', '@types/')
		: `@types/${name}`;

	const hasTypesPkg = await typesPackageExists(typesPkgName, rev);
	if (hasTypesPkg.isErr()) return hasTypesPkg;

	return Result.ok(
		hasTypesPkg ? ('definitely-typed' as const) : ('none' as const),
	);
}

const typesPackageCache = new LRUCache<string, boolean>({ max: 1000 });

// todo https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/161725ad2e8957f109e44fb26b13c9d70f415c2f/packages/core/src/createPackage.ts#L186-L200
async function typesPackageExists(typesPkgName: string, rev: string) {
	if (typesPackageCache.has(typesPkgName)) {
		return Result.ok(true);
	}

	const pkgExists = await db
		.select({ id: packageTable.id })
		.from(packageTable)
		.where(eq(packageTable.name, typesPkgName))
		.then((records) => records.length > 0);

	if (pkgExists) {
		typesPackageCache.set(typesPkgName, true);
		return Result.ok(true);
	}

	const packument = await processPackument(typesPkgName, rev);

	if (packument.isErr()) {
		if ('status' in packument.error && packument.error.status === 404) {
			typesPackageCache.set(typesPkgName, false);
			return Result.ok(false);
		}

		typesPackageCache.delete(typesPkgName);
		return packument;
	}

	typesPackageCache.set(typesPkgName, true);
	return Result.ok(true);
}
