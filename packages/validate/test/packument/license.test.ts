import { createPackumentVersion } from '@npm.rest/test/packument';
import { PackumentVersionSchema } from '../../src/packument';
import { LicenseSchema } from '../../src/packument/license';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

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
		expect(result.license).toStrictEqual([{ type: 'MIT' }]);
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
		expect(result.license).toStrictEqual([{ type: 'MIT' }]);
	});

	it('fallback to null when url fails to parse', () => {
		const version = createPackumentVersion('1.0.0');
		version.license = {
			type: 'MIT',
			url: '../../LICENSE',
		};

		const result = v.parse(PackumentVersionSchema, version);
		expect(result.license).toStrictEqual([
			{
				type: 'MIT',
				url: null,
			},
		]);
	});

	it('supports file property', () => {
		const version = createPackumentVersion('1.0.0');
		version.license = {
			type: 'MIT',
			file: 'LICENSE',
		};

		const result = v.parse(PackumentVersionSchema, version);
		expect(result.license).toStrictEqual([
			{
				type: 'MIT',
				file: 'LICENSE',
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
			},
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
		expect(result.license).toStrictEqual([
			{ type: 'MIT' },
			{ type: 'Apache-2.0' },
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
			{ type: 'MIT' },
			{
				type: 'Apache-2.0',
				url: 'https://opensource.org/licenses/Apache-2.0',
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
			},
		]);
	});

	it('maps boolean license to UNKNOWN', () => {
		const versionFalse = createPackumentVersion('1.0.0');
		versionFalse.license = false;
		const resultFalse = v.parse(PackumentVersionSchema, versionFalse);
		expect(resultFalse.license).toMatchObject([{ type: 'UNKNOWN' }]);

		const versionTrue = createPackumentVersion('1.0.0');
		versionTrue.license = true;
		const resultTrue = v.parse(PackumentVersionSchema, versionTrue);
		expect(resultTrue.license).toMatchObject([{ type: 'UNKNOWN' }]);
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

	it('maps name to type when type is missing', () => {
		const version = createPackumentVersion('1.0.0');
		version.license = { name: 'MIT' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.license).toStrictEqual([{ type: 'MIT' }]);
	});

	it('url should be null when given improper url', () => {
		const version = createPackumentVersion('1.0.0');
		// oxlint-disable-next-line eslint(no-script-url)
		version.license = { name: 'MIT', url: 'javascript:alert(1)' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.license).toStrictEqual([{ type: 'MIT', url: null }]);
	});

	it('effectively empty type or name results in null', () => {
		const version = createPackumentVersion('1.0.0');
		version.license = { type: '  ', name: '' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.license).toBeNull();
	});
});
