import { PackumentSchema, type PackumentVersionSchema } from '../src/packument';
import { fetchPackumentRaw } from '@npm.rest/test/packument';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

type InputPackument = v.InferInput<typeof PackumentSchema>;
type InputPackumentVersion = v.InferInput<typeof PackumentVersionSchema>;

function createPackumentVersion(version: string): InputPackumentVersion {
	return {
		name: 'my-package',
		description: 'A test package',
		version,
		dist: {
			shasum: 'sha256-1234567890abcdef',
			tarball:
				'https://registry.npmjs.org/my-package/-/my-package-1.0.0.tgz',
			integrity: 'sha256-1234567890abcdef',
		},
	};
}

function createPackument(): InputPackument {
	const version = '1.0.0';

	return {
		name: 'my-package',
		description: 'A test package',
		'dist-tags': { latest: version },
		versions: {
			[version]: createPackumentVersion(version),
		},
		time: {
			created: new Date().toISOString(),
			modified: new Date().toISOString(),
			[version]: new Date().toISOString(),
		},
	};
}

describe('packument', () => {
	it('parses a minimal valid packument', () => {
		const packument = createPackument();
		expect(v.is(PackumentSchema, packument)).toBeTruthy();
	});

	it('fails safeParse with invalid date strings in time', () => {
		const packument = createPackument();
		packument.time['created'] = 'not-a-date';
		const result = v.safeParse(PackumentSchema, packument);
		expect(result.success).toBeFalsy();
	});

	describe('_rev', () => {
		it('behaves as expected', () => {
			const packument = createPackument();
			packument._rev = '1-placeholder';
			const parsed = v.parse(PackumentSchema, packument);
			expect(parsed._rev).toBe('1-placeholder');
		});

		it('is not required', () => {
			const packument = createPackument();
			expect(v.is(PackumentSchema, packument)).toBeTruthy();
		});

		it('fails when invalid structure', () => {
			const packument = createPackument();
			packument._rev = 'invalid';
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
		});
	});

	describe('name', () => {
		it('behaves as expected', () => {
			const packument = createPackument();
			packument.name = 'hello-world';
			const parsed = v.parse(PackumentSchema, packument);
			expect(parsed.name).toBe('hello-world');
		});

		it('is required', () => {
			const packument = createPackument();
			// @ts-expect-error tests
			packument.name = null;
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
		});

		it('trims whitespace', () => {
			const packument = createPackument();
			packument.name = ' hello-world ';
			const parsed = v.parse(PackumentSchema, packument);
			expect(parsed.name).toBe('hello-world');
		});

		it('fails with empty name', () => {
			const packument = createPackument();
			packument.name = '';
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
		});

		it('fails with effectively empty name', () => {
			const packument = createPackument();
			packument.name = '    ';
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
		});
	});

	describe('dist-tags', () => {
		it('is required', () => {
			const packument = createPackument();
			// @ts-expect-error tests
			packument['dist-tags'] = null;
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
		});

		it('passes with empty dist-tags', () => {
			const packument = createPackument();
			packument['dist-tags'] = {};
			expect(v.is(PackumentSchema, packument)).toBeTruthy();
		});

		it('fails with effectively empty dist-tags', () => {
			const packument = createPackument();
			packument['dist-tags'] = { '': '' };
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
		});

		it('returns null when empty', () => {
			const packument = createPackument();
			packument['dist-tags'] = {};
			const parsed = v.safeParse(PackumentSchema, packument);
			expect(parsed.output).toMatchObject({ 'dist-tags': null });
		});

		it('supports missing latest in dist-tags', () => {
			const packument = createPackument();
			packument['dist-tags'] ??= {};
			// oxlint-disable-next-line eslint(no-undefined)
			packument['dist-tags'].latest = undefined;

			expect(v.is(PackumentSchema, packument)).toBeTruthy();
		});
	});

	describe('versions', () => {
		it('supports empty versions object', () => {
			const packument = createPackument();
			packument.versions = {};
			expect(v.is(PackumentSchema, packument)).toBeTruthy();
		});

		it('fails with empty version keys', () => {
			const packument = createPackument();
			packument.versions = { '': createPackumentVersion('1.0.0') };
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
		});

		it('fails with effectively empty version keys', () => {
			const packument = createPackument();
			packument.versions = { '    ': createPackumentVersion('1.0.0') };
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
		});

		it('fails with invalid version', () => {
			const packument = createPackument();
			// @ts-expect-error invalid version
			packument.versions = { '1.0.0': 'foo' };
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
		});

		it('returns null when empty', () => {
			const packument = createPackument();
			packument['versions'] = {};
			const parsed = v.safeParse(PackumentSchema, packument);
			expect(parsed.output).toMatchObject({ versions: null });
		});
	});
});

const PACKUMENTS = ['g', '@aaamrh/first-package', '@4399ywkf/cli'];

describe('real world tests', () => {
	it.for(PACKUMENTS)('parses real packument "%s"', async (name) => {
		const packument = await fetchPackumentRaw(name);
		const result = v.parse(PackumentSchema, packument);
		expect(result.name).toBe(name);
		expect(result.success).toBeFalsy();
	});
});
