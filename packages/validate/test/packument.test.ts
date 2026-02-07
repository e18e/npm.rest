import { fetchPackumentRaw } from '@npm.rest/test/packument';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import {
	PackumentVersionSchema,
	PackumentSchema,
	KeywordsSchema,
} from '../src/packument';

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

			it('is strict', () => {
				const packument = createPackument();

				packument.time.unpublished = {
					time: new Date().toISOString(),
					versions: [],
					// @ts-expect-error tests
					foo: 'bar',
				};

				expect(v.is(PackumentSchema, packument)).toBeFalsy();
			});

			it('requires at least one version', () => {
				const packument = createPackument();
				packument.time.unpublished = {
					time: new Date().toISOString(),
					versions: [],
				};
				expect(v.is(PackumentSchema, packument)).toBeFalsy();
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
			const packument = createPackument();
			packument.name = 'hello-world';
			expect(v.is(PackumentSchema, packument)).toBeTruthy();
		});

		it('is required', () => {
			const packument = createPackument();
			// @ts-expect-error tests
			packument.name = null;
			expect(v.is(PackumentSchema, packument)).toBeFalsy();
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
	});

	describe('version', () => {
		it('parses', () => {
			const version = createPackumentVersion('1.0.0');
			version.name = 'hello-world';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('is required', () => {
			const version = createPackumentVersion('1.0.0');
			// @ts-expect-error tests
			version.name = null;
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
		});

		it('fails when empty', () => {
			const version = createPackumentVersion('1.0.0');
			version.name = '';
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
		});

		it('fails when effectively empty', () => {
			const version = createPackumentVersion('1.0.0');
			version.name = '    ';
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
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
	});

	describe('license', () => {
		it('is optional', () => {
			const version = createPackumentVersion('1.0.0');
			// oxlint-disable-next-line eslint(no-undefined)
			version.license = undefined;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('supports single license', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = 'MIT';
			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toBe('MIT');
		});

		it('supports license object', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = {
				type: 'MIT',
				url: 'https://opensource.org/licenses/MIT',
			};

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toMatchObject({
				type: 'MIT',
				url: 'https://opensource.org/licenses/MIT',
			});
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
			expect(result.license).toMatchObject([
				{ type: 'MIT', url: 'https://opensource.org/licenses/MIT' },
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
				},
			]);
		});

		it('supports array of string licenses', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = ['MIT', 'Apache-2.0'];
			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toMatchObject(['MIT', 'Apache-2.0']);
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
			expect(result.license).toMatchObject([
				'MIT',
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
				},
			]);
		});

		it('strips empty strings from license array', () => {
			const version = createPackumentVersion('1.0.0');
			version.license = [
				'MIT',
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
				},
			];

			const result = v.parse(PackumentVersionSchema, version);
			expect(result.license).toMatchObject([
				'MIT',
				{
					type: 'Apache-2.0',
					url: 'https://opensource.org/licenses/Apache-2.0',
				},
			]);
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

		describe.todo('tarball');
		describe.todo('shasum');

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
	});
});

// describe('Funding validation', () => {
// 	it('supports url', () => {
// 		const parsed = v.parse(FundingObject, { url: 'https://example.com' });
// 		expect(parsed.url).toBe('https://example.com');
// 	});

// 	it('supports array of funding objects', () => {
// 		const parsed = v.parse(Funding, [{ url: 'https://example.com' }]);
// 		expect(parsed).toMatchObject([{ url: 'https://example.com' }]);
// 	});
// });

const PACKUMENTS = ['g', '@aaamrh/first-package', '@4399ywkf/cli'];

describe('real world tests', () => {
	it.for(PACKUMENTS)('parses real packument "%s"', async (name) => {
		const packument = await fetchPackumentRaw(name);
		const result = v.parse(PackumentSchema, packument);
		expect(result.name).toBe(name);
		expect(result.success).toBeFalsy();
	});
});
