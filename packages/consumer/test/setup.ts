import { beforeEach, vi } from 'vitest';

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
			// oxlint-disable-next-line typescript-eslint(no-unsafe-call)
			super(...args);

			beforeEach(() => {
				// @ts-expect-error shhh tests
				// oxlint-disable-next-line typescript-eslint(no-unsafe-call)
				this.clear();
			});
		}
	}

	return {
		LRUCache: Patched as typeof mod.LRUCache,
	};
});
