import { processPackument } from '../shared/packument';
import type { UnpackResult } from '@publint/pack';
import { Result } from 'better-result';
import { extname } from 'node:path';

const TS_FILE_EXTENSIONS = ['.ts', '.cts', '.mts', '.tsx'];

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
