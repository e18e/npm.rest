import '@npm.rest/test/mock-db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repositoryTable } from '@npm.rest/db/schema';
import { getRepository } from '../../src/pkv/repo';
import { generateId } from '@npm.rest/db/id';
import { db } from '@npm.rest/db/server';
import { eq } from 'drizzle-orm';

vi.mock(import('../../src/shared/logger'), async () => {
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

describe('get repository', () => {
	it('gets when none exists', async () => {
		const result = await getRepository({
			type: 'git',
			url: 'git+https://tangled.org/tangled.org/core',
		});

		const { id } = result.unwrap();

		const [record] = await db
			.select()
			.from(repositoryTable)
			.where(eq(repositoryTable.id, id));

		expect(record).toMatchObject({
			id,
			type: 'git',
			url: 'git+https://tangled.org/tangled.org/core',
		});
	});

	it('returns id when exists', async () => {
		const id = generateId('repo');

		const [record] = await db
			.insert(repositoryTable)
			.values({
				id,
				type: 'git',
				url: 'git+https://tangled.org/tangled.org/core',
			})
			.returning({ id: repositoryTable.id });

		expect(record).toMatchObject({ id });

		const result = await getRepository({
			type: 'git',
			url: 'git+https://tangled.org/tangled.org/core',
		});

		expect(result.unwrap()).toMatchObject({ id });
	});
});
