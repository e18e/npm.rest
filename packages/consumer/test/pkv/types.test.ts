import '@npm.rest/db/mock';
import { packageTable, packumentTable } from '@npm.rest/db/schema';
import { describe, expect, it, vi } from 'vitest';
import type { UnpackResult } from '@publint/pack';
import { hasTypes } from '../../src/pkv/types';
import { generateId } from '@npm.rest/db/id';
import { db } from '@npm.rest/db/server';

const EMPTY_UNPACK: UnpackResult = {
	files: [],
	rootDir: '/',
};

const TS_UNPACK: UnpackResult = {
	files: [{ name: 'index.d.ts', data: new Uint8Array() }],
	rootDir: '/',
};

const REV = '1-placeholder';

vi.mock('@npm.rest/db/server', async () => {
	const { drizzle } = await import('drizzle-orm/postgres-js');

	return {
		db: drizzle.mock({}),
	};
});

vi.mock(import('../../src/shared/logger'), async () => {
	const { getLogger } = await import('@logtape/logtape');

	return {
		logger: getLogger('test'),
	};
});

describe('hasTypes()', () => {
	it('returns built-in if a types package is given', async () => {
		const types = await hasTypes('@types/semver', EMPTY_UNPACK, REV);
		expect(types.status).toBe('ok');
		expect(types.unwrap()).toBe('built-in');
	});

	it('returns built-in when a types package has a ts file', async () => {
		const types = await hasTypes('semver', TS_UNPACK, REV);
		expect(types.status).toBe('ok');
		expect(types.unwrap()).toBe('built-in');
	});

	it('returns definitely-typed when a types package exists in package table', async () => {
		const name = `:${crypto.randomUUID()}`;

		await db.insert(packageTable).values({
			id: generateId('pkg'),
			name: `@types/${name}`,
			revId: '1-placeholder',
			createdAt: new Date(),
			npmUpdatedAt: new Date(),
		});

		const types = await hasTypes(name, EMPTY_UNPACK, REV);
		expect(types.status).toBe('ok');
		expect(types.unwrap()).toBe('definitely-typed');
	});

	it('returns definitely-typed when a types package exists as a packument', async () => {
		const name = `:${crypto.randomUUID()}`;

		await db.insert(packumentTable).values({
			id: `@types/${name}`,
			revId: '1-placeholder',
			data: {
				name: `@types/${name}`,
				time: {
					created: new Date().toISOString(),
					modified: new Date().toISOString(),
				},
			},
		});

		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockRejectedValue(
					new Error("fetch shouldn't have been called"),
				),
		);

		const types = await hasTypes(name, EMPTY_UNPACK, '1-placeholder');
		expect(types.status).toBe('ok');
		expect(types.unwrap()).toBe('definitely-typed');
	});
});
