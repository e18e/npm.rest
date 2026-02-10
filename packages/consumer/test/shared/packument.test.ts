import '@npm.rest/test/mock-db';
import type { PackumentSchema } from '@npm.rest/validate/packument';
import { processPackument } from '../../src/shared/packument';
import { packumentTable } from '@npm.rest/db/schema';
import { describe, expect, it, vi } from 'vitest';
import { db } from '@npm.rest/db/server';
import type * as v from 'valibot';
import { eq } from 'drizzle-orm';

vi.mock(import('../../src/shared/logger'), async () => {
	const { getLogger } = await import('@logtape/logtape');

	return {
		logger: getLogger('test'),
	};
});

function createPackument(name: string): v.InferInput<typeof PackumentSchema> {
	return {
		name: name,
		time: {
			created: new Date().toISOString(),
			modified: new Date().toISOString(),
		},
	};
}

describe('process packument', () => {
	it('stores raw packument', async () => {
		const random = crypto.randomUUID();
		const packument = createPackument('foo');
		packument.time['1.0.0'] = new Date().toISOString();
		packument.versions ??= {};
		packument.versions['1.0.0'] = {
			name: 'foo',
			version: '1.0.0',
			dist: {
				tarball:
					'https://registry.npmjs.org/my-package/-/my-package-1.0.0.tgz',
				integrity: 'sha512-foo',
			},
			repository: {
				type: 'Git',
				directory: random,
				url: 'https://github.com/foo/bar',
			},
		};

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(Response.json(packument)),
		);

		const result = await processPackument('foo', '1-placeholder');
		const processed = result.unwrap();

		expect(processed.versions?.['1.0.0'].repository).toMatchObject([
			{
				type: 'git',
				directory: random,
				url: 'https://github.com/foo/bar',
			},
		]);

		const [record] = await db
			.select({ data: packumentTable.data })
			.from(packumentTable)
			.where(eq(packumentTable.id, 'foo'));

		expect(record?.data).toMatchObject(packument);
	});
});
