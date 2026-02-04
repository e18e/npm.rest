import { publint, type PackFile } from 'publint';
import { Result } from 'better-result';

export async function runPublint(files: PackFile[]) {
	return await Result.tryPromise(async () => {
		return await publint({
			pkgDir: '/',
			pack: { files },
		});
	});
}
