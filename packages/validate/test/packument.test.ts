import { fetchPackumentRaw } from '@npm.rest/test/packument';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import {
	PackumentVersionSchema,
	RepositoryObjectSchema,
	RepositorySchema,
	PackumentSchema,
	KeywordsSchema,
	LicenseSchema,
	FundingObject,
	Funding,
} from '../src/packument';

type InputPackument = v.InferInput<typeof PackumentSchema>;
type InputPackumentVersion = v.InferInput<typeof PackumentVersionSchema>;

function createPackumentVersion(version: string): InputPackumentVersion {
	return {
		name: 'my-package',
		description: 'A test package',
		version,
		dist: {
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

		it("doesn't trim keys", () => {
			const packument = createPackument();
			packument['dist-tags'] = { '  foo  ': '^1.2.0' };

			const parsed = v.safeParse(PackumentSchema, packument);
			expect(parsed.output).toMatchObject({
				'dist-tags': { '  foo  ': '^1.2.0' },
			});
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

	describe('time', () => {
		it('is required', () => {
			const packument = createPackument();
			// @ts-expect-error tests
			packument.time = {};
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
		});

		it('requires created and modified', () => {
			const packument = createPackument();

			// @ts-expect-error tests
			packument.time = { created: new Date().toISOString() };
			expect(v.is(PackumentSchema, packument)).toBeFalsy();

			// @ts-expect-error tests
			packument.time = { modified: new Date().toISOString() };
			expect(v.is(PackumentSchema, packument)).toBeFalsy();

			packument.time = {
				created: new Date().toISOString(),
				modified: new Date().toISOString(),
			};
			expect(v.is(PackumentSchema, packument)).toBeTruthy();
		});

		it('parses date', () => {
			const packument = createPackument();
			const parsed = v.parse(PackumentSchema, packument);
			expect(parsed.time.created).instanceOf(Date);
			expect(parsed.time.modified).instanceOf(Date);
		});

		it('fails on invalid dates', () => {
			const packument = createPackument();
			packument.time = {
				created: 'invalid-date',
				modified: 'invalid-date',
			};
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
		});

		it('trims before parsing to date', () => {
			const packument = createPackument();
			const created = new Date();
			const modified = new Date();
			packument.time = {
				created: `  ${created.toISOString()}  `,
				modified: `  ${modified.toISOString()}  `,
			};

			const parsed = v.parse(PackumentSchema, packument);
			expect(parsed.time.created).instanceOf(Date);
			expect(parsed.time.created.getTime()).toBe(created.getTime());
			expect(parsed.time.modified).instanceOf(Date);
			expect(parsed.time.modified.getTime()).toBe(modified.getTime());
		});

		it('supports version dates', () => {
			const packument = createPackument();
			const versionDate = new Date();
			packument.time = {
				created: new Date().toISOString(),
				modified: new Date().toISOString(),
				'2.0.0': versionDate.toISOString(),
			};

			const parsed = v.parse(PackumentSchema, packument);
			expect(parsed.time['2.0.0']).instanceOf(Date);
			expect(parsed.time['2.0.0']?.getTime()).toBe(versionDate.getTime());
		});

		describe('unpublished', () => {
			it('is optional', () => {
				const packument = createPackument();
				// oxlint-disable-next-line eslint(no-undefined)
				packument.time.unpublished = undefined;
				expect(v.is(PackumentSchema, packument)).toBeTruthy();
			});

			it('strips extra properties', () => {
				const packument = createPackument();
				const date = new Date();
				packument.time.unpublished = {
					time: date.toISOString(),
					versions: ['2.0.0'],
					// @ts-expect-error tests
					foo: 'bar',
				};

				const parsed = v.parse(PackumentSchema, packument);
				expect(parsed.time.unpublished).toStrictEqual({
					// oxlint-disable-next-line typescript-eslint(no-unsafe-assignment)
					time: expect.any(Date),
					versions: ['2.0.0'],
				});
			});

			it('can have no versions', () => {
				const packument = createPackument();
				packument.time.unpublished = {
					time: new Date().toISOString(),
					versions: [],
				};
				expect(v.is(PackumentSchema, packument)).toBeTruthy();
			});

			it('trims time before parsing', () => {
				const packument = createPackument();
				const date = new Date();
				packument.time.unpublished = {
					time: ` ${date.toISOString()} `,
					versions: ['1.0.0'],
				};

				const parsed = v.parse(PackumentSchema, packument);
				expect(parsed.time.unpublished?.time).instanceOf(Date);
				expect(parsed.time.unpublished?.time?.getTime()).toBe(
					date.getTime(),
				);
			});
		});
	});
});

describe('packument-version validation', () => {
	describe('name', () => {
		it('parses', () => {
			const packument = createPackumentVersion('1.0.0');
			packument.name = 'hello-world';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.name).toBe('hello-world');
		});

		it('is not required', () => {
			const packument = createPackumentVersion('1.0.0');
			packument.name = null;
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.name).toBeNull();
		});

		it('turns empty name to null', () => {
			const packument = createPackumentVersion('1.0.0');
			packument.name = '';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.name).toBeNull();
		});

		it('turns effectively empty name to null', () => {
			const packument = createPackumentVersion('1.0.0');
			packument.name = '    ';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.name).toBeNull();
		});
	});

	describe('version', () => {
		it('parses', () => {
			const packument = createPackumentVersion('1.0.0');
			packument.version = '1.0.0';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.version).toBe('1.0.0');
		});

		it('is not required', () => {
			const packument = createPackumentVersion('1.0.0');
			packument.version = null;
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.version).toBeNull();
		});

		it('turns empty version to null', () => {
			const packument = createPackumentVersion('1.0.0');
			packument.version = '';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.version).toBeNull();
		});

		it('turns effectively empty version to null', () => {
			const packument = createPackumentVersion('1.0.0');
			packument.version = '    ';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.version).toBeNull();
		});
	});

	describe('description', () => {
		it('is optional', () => {
			const version = createPackumentVersion('1.0.0');
			version.description = null;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('is null when empty', () => {
			const version = createPackumentVersion('1.0.0');
			version.description = '';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('is null when effectively empty', () => {
			const version = createPackumentVersion('1.0.0');
			version.description = '    ';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('joins an array of strings', () => {
			const version = createPackumentVersion('1.0.0');
			version.description = ['hello', 'world'];
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('trims array before joining', () => {
			const version = createPackumentVersion('1.0.0');
			version.description = [' hello ', 'world '];
			const result = v.parse(PackumentVersionSchema, version);
			expect(result.description).toBe('hello world');
		});

		it('turns empty array into null', () => {
			const version = createPackumentVersion('1.0.0');
			version.description = [];
			const result = v.parse(PackumentVersionSchema, version);
			expect(result.description).toBeNull();
		});

		it('turns array of empty/effectively empty strings into null', () => {
			const version = createPackumentVersion('1.0.0');
			version.description = ['', ' ', '  '];
			const result = v.parse(PackumentVersionSchema, version);
			expect(result.description).toBeNull();
		});
	});

	describe('keywords', () => {
		it('is optional', () => {
			const version = createPackumentVersion('1.0.0');
			// oxlint-disable-next-line eslint(no-undefined)
			version.keywords = undefined;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('supports single keyword', () => {
			const result = v.parse(KeywordsSchema, 'foo');
			expect(result).toMatchObject(['foo']);
		});

		it('supports multiple keywords', () => {
			const result = v.parse(KeywordsSchema, ['foo', 'bar']);
			expect(result).toMatchObject(['foo', 'bar']);
		});

		it('supports nested keyword array', () => {
			const result = v.parse(KeywordsSchema, [
				'abc',
				['foo', 'bar'],
				['baz', 'qux'],
			]);

			expect(result).toMatchObject(['abc', 'foo', 'bar', 'baz', 'qux']);
		});

		it('deduplicates keywords', () => {
			const result = v.parse(KeywordsSchema, [
				'foo',
				'bar',
				'foo',
				'baz',
			]);
			expect(result).toMatchObject(['foo', 'bar', 'baz']);
		});

		it('deduplicates nested keywords', () => {
			const result = v.parse(KeywordsSchema, [
				'foo',
				['bar', 'foo'],
				['baz', 'qux'],
			]);

			expect(result).toMatchObject(['foo', 'bar', 'baz', 'qux']);
		});

		it('removes empty keywords', () => {
			const result = v.parse(KeywordsSchema, ['foo', 'bar', '', 'baz']);
			expect(result).toMatchObject(['foo', 'bar', 'baz']);
		});

		it('removes empty nested keywords', () => {
			const result = v.parse(KeywordsSchema, [
				'foo',
				['bar', 'foo'],
				['baz', 'qux', ''],
				['quux', 'corge'],
			]);

			expect(result).toMatchObject([
				'foo',
				'bar',
				'baz',
				'qux',
				'quux',
				'corge',
			]);
		});

		it('discard all keywords if junk is present', () => {
			const version = createPackumentVersion('1.0.0');
			// @ts-expect-error tests
			version.keywords = {};
			const result = v.parse(PackumentVersionSchema, version);
			expect(result.keywords).toBeNull();

			const version2 = createPackumentVersion('1.0.0');
			// @ts-expect-error tests
			version.keywords = [1, {}, [3]];
			const result2 = v.parse(PackumentVersionSchema, version2);
			expect(result2.keywords).toBeNull();
		});
	});

	describe('license', () => {
		it('is optional', () => {
			const version = createPackumentVersion('1.0.0');
			// oxlint-disable-next-line eslint(no-undefined)
			version.license = undefined;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('turns single string license into array', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = 'MIT';
			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toStrictEqual([
				{ type: 'MIT', file: null, name: null, url: null },
			]);
		});

		it('turns single object license into array', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = {
				type: 'MIT',
				url: 'https://opensource.org/licenses/MIT',
			};

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toStrictEqual([
				{
					type: 'MIT',
					url: 'https://opensource.org/licenses/MIT',
					file: null,
					name: null,
				},
			]);
		});

		it('returns null when array is empty', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = [];

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toBeNull();
		});

		it('maps to null when object is empty', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = {};

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toBeNull();
		});

		it('maps to null when all object values are null', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = {
				type: null,
				url: null,
				file: null,
			};

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toBeNull();
		});

		it('url is optional', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = {
				type: 'MIT',
			};

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toStrictEqual([
				{ type: 'MIT', file: null, name: null, url: null },
			]);
		});

		it('fallback to null when url fails to parse', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = {
				type: 'MIT',
				name: 'MIT License',
				url: '../../LICENSE',
			};

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toStrictEqual([
				{
					type: 'MIT',
					name: 'MIT License',
					url: null,
					file: null,
				},
			]);
		});

		it('supports file property', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = {
				type: 'MIT',
				name: 'MIT License',
				file: 'LICENSE',
			};

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toStrictEqual([
				{
					type: 'MIT',
					name: 'MIT License',
					file: 'LICENSE',
					url: null,
				},
			]);
		});

		it('supports multiple license objects', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = [
				{ type: 'MIT', url: 'https://opensource.org/licenses/MIT' },
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
				},
			];

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toStrictEqual([
				{
					type: 'MIT',
					url: 'https://opensource.org/licenses/MIT',
					file: null,
					name: null,
				},
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
					file: null,
					name: null,
				},
			]);
		});

		it('supports array of string licenses', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = ['MIT', 'Apache-2.0'];

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toStrictEqual([
				{ type: 'MIT', file: null, name: null, url: null },
				{ type: 'Apache-2.0', file: null, name: null, url: null },
			]);
		});

		it('supports mixed array of string and object licenses', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = [
				'MIT',
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
				},
			];

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toStrictEqual([
				{ type: 'MIT', file: null, name: null, url: null },
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
					file: null,
					name: null,
				},
			]);
		});

		it('strips empty strings from license array', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = [
				'',
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
				},
			];

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toMatchObject([
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
				},
			]);
		});

		it('strips effectively empty strings from license array', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = [
				'    ',
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
				},
			];

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toStrictEqual([
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
					file: null,
					name: null,
				},
			]);
		});

		it('maps boolean license to UNKNOWN', () => {
			const versionFalse = createPackumentVersion('1.0.0');
			versionFalse.license = false;
			const resultFalse = v.parse(PackumentVersionSchema, versionFalse);
			expect(resultFalse.license).toMatchObject([
				{ type: 'UNKNOWN', file: null, name: null, url: null },
			]);

			const versionTrue = createPackumentVersion('1.0.0');
			versionTrue.license = true;
			const resultTrue = v.parse(PackumentVersionSchema, versionTrue);
			expect(resultTrue.license).toMatchObject([
				{ type: 'UNKNOWN', file: null, name: null, url: null },
			]);
		});

		it('only supports license false top level', () => {
			const parsed = v.parse(LicenseSchema, [false]);
			expect(parsed).toBeNull();
		});

		it('fallsback to null when failing to parse name', () => {
			const version = createPackumentVersion('1.0.0');
			// @ts-expect-error tests
			version.license = { name: { foo: 'bar' } };

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.license).toBeNull();
		});

		it('fallsback to null when given a number', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = 123;

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.license).toBeNull();
		});
	});

	describe('homepage', () => {
		it('is optional', () => {
			const version = createPackumentVersion('1.0.0');
			// oxlint-disable-next-line eslint(no-undefined)
			version.homepage = undefined;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('supports single string', () => {
			const version = createPackumentVersion('1.0.0');
			version.homepage = 'https://example.com';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('becomes null when empty', () => {
			const version = createPackumentVersion('1.0.0');
			version.homepage = '';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('becomes null when effectively empty', () => {
			const version = createPackumentVersion('1.0.0');
			version.homepage = '  ';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('becomes null when invalid', () => {
			const version = createPackumentVersion('1.0.0');
			version.homepage = 'invalid';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});
	});

	describe('dist', () => {
		it('is required', () => {
			const version = createPackumentVersion('1.0.0');
			// @ts-expect-error tests
			// oxlint-disable-next-line eslint(no-undefined)
			version.dist = undefined;
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
		});

		it("can't be empty", () => {
			const version = createPackumentVersion('1.0.0');
			// @ts-expect-error tests
			version.dist = {};
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
		});

		describe('tarball', () => {
			it('works as expected', () => {
				const version = createPackumentVersion('1.0.0');
				version.dist.tarball = 'https://example.com/tarball';
				const parsed = v.parse(PackumentVersionSchema, version);
				expect(parsed.dist.tarball).toBe('https://example.com/tarball');
			});

			it('is required', () => {
				const version = createPackumentVersion('1.0.0');
				// @ts-expect-error tests
				version.dist.tarball = null;
				expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
			});

			it('must be a url', () => {
				const version = createPackumentVersion('1.0.0');
				version.dist.tarball = 'invalid';
				expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
			});
		});

		describe('integrity', () => {
			it('is optional', () => {
				const version = createPackumentVersion('1.0.0');
				// oxlint-disable-next-line eslint(no-undefined)
				version.dist.integrity = undefined;
				expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
			});

			it('works as expected', () => {
				const version = createPackumentVersion('1.0.0');
				version.dist.integrity = 'sha512-abc123';
				const parsed = v.parse(PackumentVersionSchema, version);
				expect(parsed.dist.integrity).toBe('sha512-abc123');
			});

			it('fails on invalid integrity', () => {
				const version = createPackumentVersion('1.0.0');
				version.dist.integrity = 'invalid';
				expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
			});
		});
	});

	describe('deprecated', () => {
		it('is optional', () => {
			const version = createPackumentVersion('1.0.0');
			// oxlint-disable-next-line eslint(no-undefined)
			version.deprecated = undefined;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('is null when empty', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = '';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('is null when effectively empty', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = '         ';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('allows false', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = false;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('allows true', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = true;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('parses as expected', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = 'This version is deprecated';
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({
				deprecated: 'This version is deprecated',
			});
		});

		it('can be an object', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = { foo: 'This version is deprecated' };
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it("object can't be empty", () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = {};
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
		});

		it('object must have not have empty key', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = { '': 'deprecated' };
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
		});

		it('object must not have effectively empty key', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = { '   ': 'deprecated' };
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
		});

		it('object must have not have empty value', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = { foo: '' };
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
		});

		it('object must not have effectively empty value', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = { foo: '   ' };
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
		});

		it('flattens object message to string', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = { foo: 'This version is deprecated' };
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.deprecated).toBe('foo: This version is deprecated');
		});

		it('flattens multi key object message to string', () => {
			const version = createPackumentVersion('1.0.0');
			version.deprecated = {
				foo: 'This version is deprecated',
				bar: 'This version is deprecated',
			};
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.deprecated).toBe(
				'foo: This version is deprecated, bar: This version is deprecated',
			);
		});

		it.skip('falls back to null when something unsupported is given', () => {
			const version = createPackumentVersion('1.0.0');
			// @ts-expect-error tests
			version.deprecated = { foo: { bar: 'baz' } };
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.deprecated).toBeNull();
		});
	});

	describe('funding', () => {
		it('is nullable', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = null;
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toBeNull();
		});

		it('is optional', () => {
			const version = createPackumentVersion('1.0.0');
			// oxlint-disable-next-line eslint(no-undefined)
			version.funding = undefined;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('supports url', () => {
			const parsed = v.parse(FundingObject, {
				url: 'https://example.com',
			});

			expect(parsed.url).toBe('https://example.com');
		});

		it('supports array of funding objects', () => {
			const parsed = v.parse(Funding, [
				{ url: 'https://example.com' },
				{ url: 'https://foo.com' },
			]);

			expect(parsed).toMatchObject([
				{ url: 'https://example.com' },
				{ url: 'https://foo.com' },
			]);
		});

		it('turns empty array into null', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = [];
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toBeNull();
		});

		it('turns array with only null into null', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = [null];
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toBeNull();
		});

		it('turns empty object to null', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = {};
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toBeNull();
		});

		it('turns empty string into null', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = '';
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toBeNull();
		});

		it('turns effectively empty string into null', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = '    ';
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toBeNull();
		});

		it('transforms single object to array', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = { url: 'https://example.com' };

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toStrictEqual([
				{ url: 'https://example.com' },
			]);
		});

		it('transforms single string to object array', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = 'https://example.com';

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toStrictEqual([
				{ url: 'https://example.com' },
			]);
		});

		it('turns unknown funding type into unknown', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = { type: 'foo', url: 'https://example.com' };

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toStrictEqual([
				{ type: 'unknown', url: 'https://example.com' },
			]);
		});

		it('normalises funding type to lowercase before parsing', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = { type: 'GitHub', url: 'https://example.com' };

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toStrictEqual([
				{ type: 'github', url: 'https://example.com' },
			]);
		});

		it('trims funding type before parsing', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = { type: ' github ', url: 'https://example.com' };

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toStrictEqual([
				{ type: 'github', url: 'https://example.com' },
			]);
		});

		it('transforms false to null', () => {
			const versionFalse = createPackumentVersion('1.0.0');
			versionFalse.funding = false;
			const parsedFalse = v.parse(PackumentVersionSchema, versionFalse);
			expect(parsedFalse.funding).toBeNull();

			const versionTrue = createPackumentVersion('1.0.0');
			versionTrue.funding = true;
			const parsedTrue = v.parse(PackumentVersionSchema, versionTrue);
			expect(parsedTrue.funding).toBeNull();
		});

		it('supports known funding types', () => {
			const version = createPackumentVersion('1.0.0');
			version.funding = { type: 'github', url: 'https://example.com' };

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.funding).toStrictEqual([
				{ type: 'github', url: 'https://example.com' },
			]);
		});

		it.for([
			['github', 'github'],
			['buy_me_a_coffee', 'buy-me-a-coffee'],
			['Buy Me a coffee', 'buy-me-a-coffee'],
			['open_collective', 'open-collective'],
			['open collective', 'open-collective'],
			['GitHub Sponsors', 'github'],
			['git hub sponsors', 'github'],
			['GitHub - foo', 'github'],
			['PayPal', 'paypal'],
			['PayPal - foo', 'paypal'],
			['Ko_fi', 'ko-fi'],
		])('parses aliased type %s to %s', ([input, expected]) => {
			const parsed = v.parse(FundingObject, {
				type: input,
				url: 'https://example.com',
			});

			expect(parsed).toStrictEqual({
				type: expected,
				url: 'https://example.com',
			});
		});
	});

	describe('repository', () => {
		it('parses repository object to array', () => {
			const parsed = v.parse(RepositorySchema, {
				type: 'git',
				url: 'https://github.com/owner/repo',
			});

			expect(parsed).toStrictEqual([
				{
					type: 'git',
					url: 'https://github.com/owner/repo',
					directory: null,
					branch: null,
				},
			]);
		});

		it('parses repository string url to array', () => {
			const parsed = v.parse(
				RepositorySchema,
				'https://github.com/owner/repo',
			);

			expect(parsed).toStrictEqual([
				{
					type: null,
					url: 'https://github.com/owner/repo',
					directory: null,
					branch: null,
				},
			]);
		});

		it('parses array of string urls to array', () => {
			const parsed = v.parse(RepositorySchema, [
				'https://github.com/owner/repo',
				'https://github.com/owner/repo2',
			]);

			expect(parsed).toStrictEqual([
				{
					type: null,
					url: 'https://github.com/owner/repo',
					directory: null,
					branch: null,
				},
				{
					type: null,
					url: 'https://github.com/owner/repo2',
					directory: null,
					branch: null,
				},
			]);
		});

		it('parses array of repo objects to array', () => {
			const parsed = v.parse(RepositorySchema, [
				{
					type: 'git',
					url: 'https://github.com/owner/repo',
					directory: null,
					branch: null,
				},
				{
					type: 'git',
					url: 'https://github.com/owner/repo2',
					directory: null,
					branch: null,
				},
			]);

			expect(parsed).toStrictEqual([
				{
					type: 'git',
					url: 'https://github.com/owner/repo',
					directory: null,
					branch: null,
				},
				{
					type: 'git',
					url: 'https://github.com/owner/repo2',
					directory: null,
					branch: null,
				},
			]);
		});

		it('url is required', () => {
			const parsed = v.safeParse(RepositoryObjectSchema, {
				directory: './foo/bar',
			});

			expect(parsed.success).toBeFalsy();
		});

		it('valid url is required', () => {
			const parsed = v.safeParse(RepositoryObjectSchema, {
				url: 'foo',
			});

			expect(parsed.success).toBeFalsy();
		});

		it('trims url before parsing', () => {
			const parsed = v.parse(RepositoryObjectSchema, {
				type: 'git',
				url: '   https://github.com/owner/repo   ',
			});

			expect(parsed?.url).toBe('https://github.com/owner/repo');
		});

		it('supports git type', () => {
			const parsed = v.parse(RepositoryObjectSchema, {
				type: 'git',
				url: 'https://github.com/owner/repo',
			});

			expect(parsed?.type).toBe('git');
		});

		it('turns type to lowercase before parsing', () => {
			const parsed = v.parse(RepositoryObjectSchema, {
				type: 'Git',
				url: 'https://github.com/owner/repo',
			});

			expect(parsed?.type).toBe('git');
		});

		it('trims type before parsing', () => {
			const parsed = v.parse(RepositoryObjectSchema, {
				type: '   git   ',
				url: 'https://github.com/owner/repo',
			});

			expect(parsed?.type).toBe('git');
		});

		it('transforms github type to git', () => {
			const parsed = v.parse(RepositoryObjectSchema, {
				type: 'github',
				url: 'https://github.com/owner/repo',
			});

			expect(parsed).toMatchObject({ type: 'git' });
		});

		it('transforms empty type to null', () => {
			const parsed = v.parse(RepositoryObjectSchema, {
				type: '',
				url: 'https://github.com/owner/repo',
			});

			expect(parsed?.type).toBeNull();
		});

		it('transforms effectively empty type to null', () => {
			const parsed = v.parse(RepositoryObjectSchema, {
				type: '   ',
				url: 'https://github.com/owner/repo',
			});

			expect(parsed?.type).toBeNull();
		});

		it('turns empty array to null', () => {
			const parsed = v.parse(RepositorySchema, []);
			expect(parsed).toBeNull();
		});

		it('turns unknown types to unknown', () => {
			const parsed = v.parse(RepositoryObjectSchema, {
				type: 'npm',
				url: 'https://github.com/owner/repo',
			});

			expect(parsed?.type).toBe('unknown');
		});

		it('turns repo that is a non-url string to null', () => {
			const parsed = v.parse(RepositorySchema, 'example/repo');
			expect(parsed).toBeNull();
		});

		it('turns url of repository object that is non-url to null', () => {
			const parsed = v.parse(RepositorySchema, { url: 'example/repo' });
			expect(parsed).toBeNull();
		});

		it('turns repository object that has non-url url to null', () => {
			const parsed = v.parse(RepositorySchema, { url: 'example/repo' });
			expect(parsed).toBeNull();
		});

		it('turns empty repository object to null', () => {
			const parsed = v.parse(RepositorySchema, {});
			expect(parsed).toBeNull();
		});

		it('turns empty branch string to null', () => {
			const parsed = v.parse(RepositoryObjectSchema, {
				branch: '',
				url: 'https://github.com/owner/repo',
			});

			expect(parsed).toMatchObject({ branch: null });
		});

		it('turns empty directory string to null', () => {
			const parsed = v.parse(RepositoryObjectSchema, {
				directory: '',
				url: 'https://github.com/owner/repo',
			});

			expect(parsed).toMatchObject({ directory: null });
		});

		it('handles array mixed validities gracefully', () => {
			const parsed = v.parse(RepositorySchema, [
				'https://github.com/owner/repo',
				{ url: 'foo' },
				{ url: 'https://example.com' },
			]);

			expect(parsed).toStrictEqual([
				{
					type: null,
					url: 'https://github.com/owner/repo',
					directory: null,
					branch: null,
				},
				{
					type: null,
					url: 'https://example.com',
					directory: null,
					branch: null,
				},
			]);
		});

		it('discards repository object with npm url', () => {
			const parsed = v.parse(RepositorySchema, {
				url: 'https://npmjs.com/foo',
			});

			expect(parsed).toBeNull();
		});
	});

	describe.for([
		'dependencies' as const,
		'devDependencies' as const,
		'optionalDependencies' as const,
		'peerDependencies' as const,
		// oxlint-disable-next-line jest/valid-describe-callback todo report bug?
	])('%s', (type) => {
		it('is optional', () => {
			const version = createPackumentVersion('1.0.0');
			version[type] = {};
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('is nullable', () => {
			const version = createPackumentVersion('1.0.0');
			version[type] = null;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('becomes null when empty', () => {
			const version = createPackumentVersion('1.0.0');
			version[type] = {};
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({ [type]: null });
		});

		it('empty keys are stripped', () => {
			const version = createPackumentVersion('1.0.0');
			version[type] = { '': '1.0.0', foo: '2.0.0' };
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed[type]).toStrictEqual({ foo: '2.0.0' });
		});

		it('empty keys and values are stripped', () => {
			const version = createPackumentVersion('1.0.0');
			version[type] = { '': '', foo: '2.0.0' };
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed[type]).toStrictEqual({ foo: '2.0.0' });
		});

		it('effectively empty keys are stripped', () => {
			const version = createPackumentVersion('1.0.0');
			version[type] = { '   ': '1.0.0', foo: '2.0.0' };
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed[type]).toStrictEqual({ foo: '2.0.0' });
		});

		it('effectively empty keys and values are stripped', () => {
			const version = createPackumentVersion('1.0.0');
			version[type] = { '   ': '    ', foo: '2.0.0' };
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed[type]).toStrictEqual({ foo: '2.0.0' });
		});

		it('values can be empty', () => {
			const version = createPackumentVersion('1.0.0');
			version[type] = { foo: '' };
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('values become null when empty', () => {
			const version = createPackumentVersion('1.0.0');
			version[type] = { foo: '', bar: '2.0.0' };

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({
				[type]: { foo: null, bar: '2.0.0' },
			});
		});

		it('values become null when all values are null', () => {
			const version = createPackumentVersion('1.0.0');
			version[type] = { foo: null, bar: null };

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({
				[type]: null,
			});
		});

		it('turns string into null', () => {
			const version = createPackumentVersion('1.0.0');
			version[type] = 'foo';

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({
				[type]: null,
			});
		});

		it('fallsback to null when value is unparsable', () => {
			const version = createPackumentVersion('1.0.0');
			// @ts-expect-error tests
			version[type] = { foo: { bar: 'baz' }, quz: '1.0.0' };

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed[type]).toStrictEqual({
				quz: '1.0.0',
				foo: null,
			});
		});
	});

	describe('peerDependenciesMeta', () => {
		it('is optional', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {};
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('becomes null when empty', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {};
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({ peerDependenciesMeta: null });
		});

		it('empty keys are stripped', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {
				'': { optional: false },
				foo: { optional: true },
			};

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.peerDependenciesMeta).toStrictEqual({
				foo: { optional: true },
			});
		});

		it('empty keys and values are stripped', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {
				foo: { optional: true },
				// @ts-expect-error tests
				'': '',
			};

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.peerDependenciesMeta).toStrictEqual({
				foo: { optional: true },
			});
		});

		it('effectively empty keys are stripped', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {
				'  ': { optional: false },
				foo: { optional: true },
			};

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.peerDependenciesMeta).toStrictEqual({
				foo: { optional: true },
			});
		});

		it('effectively empty keys and values are stripped', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {
				foo: { optional: true },
				// @ts-expect-error tests
				'    ': '    ',
			};

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed.peerDependenciesMeta).toStrictEqual({
				foo: { optional: true },
			});
		});

		it('strips unknown keys', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {
				// @ts-expect-error tests
				foo: { optional: true, bar: 'baz' },
			};
			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({
				peerDependenciesMeta: { foo: { optional: true } },
			});
		});

		it('maps incorrect key values to null', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {
				// @ts-expect-error tests
				foo: 'bar',
				baz: { optional: true },
			};

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({
				peerDependenciesMeta: { foo: null, baz: { optional: true } },
			});
		});

		it('maps string value to null', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {
				// @ts-expect-error tests
				foo: '^1.0.0',
				bar: { optional: true },
			};

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({
				peerDependenciesMeta: { foo: null },
			});
		});

		it('maps boolean value to null', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {
				// @ts-expect-error tests
				foo: true,
				bar: { optional: true },
			};

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({
				peerDependenciesMeta: { foo: null, bar: { optional: true } },
			});
		});

		it('maps to null when all values are null', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {
				foo: null,
				bar: null,
			};

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({
				peerDependenciesMeta: null,
			});
		});

		it('preserves correct values amongst incorrect ones', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {
				bar: { optional: false },
				// @ts-expect-error tests
				foo: true,
				baz: { optional: true },
			};

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({
				peerDependenciesMeta: {
					bar: { optional: false },
					foo: null,
					baz: { optional: true },
				},
			});
		});

		it('parses strings pretending to be booleans', () => {
			const version = createPackumentVersion('1.0.0');
			version.peerDependenciesMeta = {
				bar: { optional: 'false' },
				baz: { optional: 'true' },
			};

			const parsed = v.parse(PackumentVersionSchema, version);
			expect(parsed).toMatchObject({
				peerDependenciesMeta: {
					bar: { optional: false },
					baz: { optional: true },
				},
			});
		});
	});
});

const PACKUMENTS = [
	'g',
	'@aaamrh/first-package',
	'@4399ywkf/cli',
	'@porsche-data-layer/library',
	'bento',
	'drceglamoney',
	'brixo-framework',
	'ljon-r2-test-2',
	'repeat',
	'zachtestproject3',
];

describe('real world tests', () => {
	it.for(PACKUMENTS)('parses real packument "%s"', async (name) => {
		const packument = await fetchPackumentRaw(name);
		const result = v.parse(PackumentSchema, packument);
		expect(result.name).toBe(name);
		expect(result.success).toBeFalsy();
	});
});
