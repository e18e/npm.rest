import type { UnpackResult } from '@publint/pack';
import { Result } from 'better-result';
import { publint } from 'publint';

export async function runPublint(tarball: UnpackResult) {
	return await Result.tryPromise(async () => {
		return await publint({
			pkgDir: tarball.rootDir,
			pack: { files: tarball.files },
		});
	});
}
