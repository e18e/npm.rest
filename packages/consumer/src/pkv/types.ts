import { processPackument } from '../shared/packument';
import type { UnpackResult } from '@publint/pack';
import { Result } from 'better-result';
import { LRUCache } from 'lru-cache';
import { extname } from 'node:path';

const TS_FILE_EXTENSIONS = ['.ts', '.cts', '.mts', '.tsx'];

const dtCache = new LRUCache<string, boolean>({ max: 1000 });

// todo https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/161725ad2e8957f109e44fb26b13c9d70f415c2f/packages/core/src/createPackage.ts#L186-L200
export async function hasTypes(name: string, tarball: UnpackResult) {
	if (name.startsWith('@types/')) {
		return Result.ok('built-in' as const);
	}

	const containsTypes = tarball.files.some((file) =>
		TS_FILE_EXTENSIONS.includes(extname(file.name)),
	);

	if (containsTypes) {
		return Result.ok('built-in' as const);
	}

	if (dtCache.has(name)) {
		return Result.ok(
			dtCache.get(name)
				? ('definitely-typed' as const)
				: ('none' as const),
		);
	}

	const pkg = await processPackument(
		name.startsWith('@')
			? name.replace('/', '__').replace('@', '@types/')
			: `@types/${name}`,
	);

	if (pkg.isErr()) {
		if ('status' in pkg.error && pkg.error.status === 404) {
			dtCache.set(name, false);
			return Result.ok('none' as const);
		}

		return pkg;
	}

	dtCache.set(name, true);
	return Result.ok('definitely-typed' as const);
}
