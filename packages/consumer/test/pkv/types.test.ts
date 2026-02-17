import '../setup';
import '@npm.rest/test/mock-db';
import { packageTable, packumentTable } from '@npm.rest/db/schema';
import { createPackument } from '@npm.rest/test/packument';
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
		const packument = createPackument();
		packument.name = `@types/${name}`;

		await db.insert(packumentTable).values({
			id: `@types/${name}`,
			revId: '1-placeholder',
			data: packument,
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

	it("returns none when types not built in and types package doesn't exist", async () => {
		const name = `:${crypto.randomUUID()}`;

		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(new Response('Not Found', { status: 404 })),
		);

		const types = await hasTypes(name, EMPTY_UNPACK, REV);
		expect(types.status).toBe('ok');
		expect(types.unwrap()).toBe('none');
	});

	it('returns an error when packument fetch failed', async () => {
		const name = `:${crypto.randomUUID()}`;

		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					new Response("I'm a competing registry", { status: 418 }),
				),
		);

		const types = await hasTypes(name, EMPTY_UNPACK, REV);
		expect(types.status).toBe('error');
		expect(() => types.unwrap()).toThrow();
	});

	it('returns definitely-typed when package is found via packument fetch', async () => {
		const name = `:${crypto.randomUUID()}`;
		const packument = createPackument();
		packument.name = name;

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json(packument, {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
					},
				}),
			),
		);

		const types = await hasTypes(name, EMPTY_UNPACK, REV);
		expect(types.status).toBe('ok');
		expect(types.unwrap()).toBe('definitely-typed');
	});

	it('hits typesPackageCache', async () => {
		const name = `:${crypto.randomUUID()}`;
		const packument = createPackument();
		packument.name = `@types/${name}`;

		await db.insert(packumentTable).values({
			id: `@types/${name}`,
			revId: '1-placeholder',
			data: packument,
		});

		const types = await hasTypes(name, EMPTY_UNPACK, '1-placeholder');
		expect(types.status).toBe('ok');
		expect(types.unwrap()).toBe('definitely-typed');

		await db.delete(packumentTable);

		const types2 = await hasTypes(name, EMPTY_UNPACK, '1-placeholder');
		expect(types2.status).toBe('ok');
		expect(types2.unwrap()).toBe('definitely-typed');
	});

	it('correctly gets scoped package @types name', async () => {
		const ftch = vi
			.fn()
			.mockResolvedValue(new Response('Not Found', { status: 404 }));

		vi.stubGlobal('fetch', ftch);

		const types = await hasTypes('@foo/bar', EMPTY_UNPACK, REV);
		expect(types.status).toBe('ok');
		expect(types.unwrap()).toBe('none');

		expect(ftch).toHaveBeenCalledOnce();
		expect(ftch).toHaveBeenCalledWith(
			expect.stringContaining('/@types/foo__bar'),
			expect.objectContaining({}),
		);
	});
});
