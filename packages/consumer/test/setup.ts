import { beforeEach, vi } from 'vitest';
import { Result } from 'better-result';

vi.mock(import('../src/shared/logger'), async () => {
	const { getLogger } = await import('@logtape/logtape');

	return {
		logger: getLogger('test'),
	};
});

vi.mock(import('lru-cache'), async (importOriginal) => {
	const mod = await importOriginal();

	// @ts-expect-error shhh tests
	class Patched extends mod.LRUCache {
		constructor(...args: unknown[]) {
			// oxlint-disable-next-line typescript-eslint/no-unsafe-call
			super(...args);

			beforeEach(() => {
				// @ts-expect-error shhh tests
				// oxlint-disable-next-line typescript-eslint/no-unsafe-call
				this.clear();
			});
		}
	}

	return {
		LRUCache: Patched as typeof mod.LRUCache,
	};
});

vi.mock(import('../src/pkv/tarball'), () => ({
	// oxlint-disable-next-line eslint/require-await
	async downloadTarball() {
		return Result.ok({
			unpackedSize: 128,
			packedSize: 8,
			rootDir: 'package',
			files: [],
		});
	},
}));

vi.mock(import('../src/pkv/publint'), () => ({
	// oxlint-disable-next-line eslint/require-await
	async runPublint() {
		return Result.ok({ pkg: {}, messages: [] });
	},
}));
