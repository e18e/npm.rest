import '@npm.rest/test/mock-db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLicense } from '../../src/pkv/license';
import { licenseTable } from '@npm.rest/db/schema';
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

describe('get license', () => {
	it('gets when none exists', async () => {
		const result = await getLicense({ type: 'MIT' });
		const id = result.unwrap();

		const [record] = await db
			.select()
			.from(licenseTable)
			.where(eq(licenseTable.id, id));

		expect(record).toMatchObject({
			id,
			type: 'MIT',
		});
	});

	it('returns id when exists', async () => {
		const id = generateId('lcs');

		const [record] = await db
			.insert(licenseTable)
			.values({
				id,
				type: 'MIT',
			})
			.returning({ id: licenseTable.id });

		expect(record).toMatchObject({ id });

		const result = await getLicense({ type: 'MIT' });
		expect(result.unwrap()).toBe(id);
	});
});
