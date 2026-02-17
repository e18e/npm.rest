import { createInputPackumentVersion } from '@npm.rest/test/packument';
import { PackumentVersionSchema } from '../../src/packument';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

describe('packument-version validation', () => {
	describe('name', () => {
		it('parses', () => {
			const packument = createInputPackumentVersion('1.0.0');
			packument.name = 'hello-world';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.name).toBe('hello-world');
		});

		it('is not required', () => {
			const packument = createInputPackumentVersion('1.0.0');
			packument.name = null;
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.name).toBeNull();
		});

		it('turns empty name to null', () => {
			const packument = createInputPackumentVersion('1.0.0');
			packument.name = '';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.name).toBeNull();
		});

		it('turns effectively empty name to null', () => {
			const packument = createInputPackumentVersion('1.0.0');
			packument.name = '    ';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.name).toBeNull();
		});
	});

	describe('version', () => {
		it('parses', () => {
			const packument = createInputPackumentVersion('1.0.0');
			packument.version = '1.0.0';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.version).toBe('1.0.0');
		});

		it('is not required', () => {
			const packument = createInputPackumentVersion('1.0.0');
			packument.version = null;
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.version).toBeNull();
		});

		it('turns empty version to null', () => {
			const packument = createInputPackumentVersion('1.0.0');
			packument.version = '';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.version).toBeNull();
		});

		it('turns effectively empty version to null', () => {
			const packument = createInputPackumentVersion('1.0.0');
			packument.version = '    ';
			const parsed = v.parse(PackumentVersionSchema, packument);
			expect(parsed.version).toBeNull();
		});
	});

	describe('description', () => {
		it('is optional', () => {
			const version = createInputPackumentVersion('1.0.0');
			version.description = null;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('is null when empty', () => {
			const version = createInputPackumentVersion('1.0.0');
			version.description = '';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('is null when effectively empty', () => {
			const version = createInputPackumentVersion('1.0.0');
			version.description = '    ';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('joins an array of strings', () => {
			const version = createInputPackumentVersion('1.0.0');
			version.description = ['hello', 'world'];
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('trims array before joining', () => {
			const version = createInputPackumentVersion('1.0.0');
			version.description = [' hello ', 'world '];
			const result = v.parse(PackumentVersionSchema, version);
			expect(result.description).toBe('hello world');
		});

		it('turns empty array into null', () => {
			const version = createInputPackumentVersion('1.0.0');
			version.description = [];
			const result = v.parse(PackumentVersionSchema, version);
			expect(result.description).toBeNull();
		});

		it('turns array of empty/effectively empty strings into null', () => {
			const version = createInputPackumentVersion('1.0.0');
			version.description = ['', ' ', '  '];
			const result = v.parse(PackumentVersionSchema, version);
			expect(result.description).toBeNull();
		});
	});

	describe('homepage', () => {
		it('is optional', () => {
			const version = createInputPackumentVersion('1.0.0');
			// oxlint-disable-next-line eslint(no-undefined)
			version.homepage = undefined;
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('supports single string', () => {
			const version = createInputPackumentVersion('1.0.0');
			version.homepage = 'https://example.com';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('becomes null when empty', () => {
			const version = createInputPackumentVersion('1.0.0');
			version.homepage = '';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('becomes null when effectively empty', () => {
			const version = createInputPackumentVersion('1.0.0');
			version.homepage = '  ';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});

		it('becomes null when invalid', () => {
			const version = createInputPackumentVersion('1.0.0');
			version.homepage = 'invalid';
			expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
		});
	});

	describe('dist', () => {
		it('is required', () => {
			const version = createInputPackumentVersion('1.0.0');
			// @ts-expect-error tests
			// oxlint-disable-next-line eslint(no-undefined)
			version.dist = undefined;
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
		});

		it("can't be empty", () => {
			const version = createInputPackumentVersion('1.0.0');
			// @ts-expect-error tests
			version.dist = {};
			expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
		});

		describe('tarball', () => {
			it('works as expected', () => {
				const version = createInputPackumentVersion('1.0.0');
				version.dist.tarball = 'https://example.com/tarball';
				const parsed = v.parse(PackumentVersionSchema, version);
				expect(parsed.dist.tarball).toBe('https://example.com/tarball');
			});

			it('is required', () => {
				const version = createInputPackumentVersion('1.0.0');
				// @ts-expect-error tests
				version.dist.tarball = null;
				expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
			});

			it('must be a url', () => {
				const version = createInputPackumentVersion('1.0.0');
				version.dist.tarball = 'invalid';
				expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
			});
		});

		describe('integrity', () => {
			it('is optional', () => {
				const version = createInputPackumentVersion('1.0.0');
				// oxlint-disable-next-line eslint(no-undefined)
				version.dist.integrity = undefined;
				expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
			});

			it('works as expected', () => {
				const version = createInputPackumentVersion('1.0.0');
				version.dist.integrity = 'sha512-abc123';
				const parsed = v.parse(PackumentVersionSchema, version);
				expect(parsed.dist.integrity).toBe('sha512-abc123');
			});

			it('fails on invalid integrity', () => {
				const version = createInputPackumentVersion('1.0.0');
				version.dist.integrity = 'invalid';
				expect(v.is(PackumentVersionSchema, version)).toBeFalsy();
			});
		});
	});
});
