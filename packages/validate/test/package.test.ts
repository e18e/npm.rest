import { describe, expect, test } from 'vitest';
import * as v from 'valibot';
import {
	PackageNameSchema,
	SemverSchema,
	SpecifierExactSchema,
	SpecifierSchema,
} from '../src/package.ts';

describe('PackageNameSchema', () => {
	test('accepts valid unscoped name', () => {
		expect(v.parse(PackageNameSchema, 'my-pkg')).toBe('my-pkg');
	});

	test('accepts valid scoped name', () => {
		expect(v.parse(PackageNameSchema, '@scope/my-pkg')).toBe(
			'@scope/my-pkg',
		);
	});

	// test('accepts valid edge case name', () => {
	// 	expect(v.parse(PackageNameSchema, '-@1.0.0')).toBe('-@1.0.0');
	// });

	test('rejects empty string', () => {
		expect(() => v.parse(PackageNameSchema, '')).toThrow();
	});

	test('rejects non-string', () => {
		expect(() => v.parse(PackageNameSchema, 123)).toThrow();
	});

	test('rejects invalid name with spaces', () => {
		expect(() => v.parse(PackageNameSchema, 'bad name')).toThrow();
	});

	test('rejects name starting with a dot', () => {
		expect(() => v.parse(PackageNameSchema, '.bad')).toThrow();
	});

	test('rejects name starting with an underscore', () => {
		expect(() => v.parse(PackageNameSchema, '_bad')).toThrow();
	});
});

describe('SemverSchema', () => {
	test('parses valid semver', () => {
		expect(v.parse(SemverSchema, '1.0.0')).toBe('1.0.0');
	});

	test('parses semver with prerelease', () => {
		expect(v.parse(SemverSchema, '1.0.0-beta.1')).toBe('1.0.0-beta.1');
	});

	test('rejects invalid semver', () => {
		expect(() => v.parse(SemverSchema, 'not-a-version')).toThrow();
	});

	test('rejects non-string', () => {
		expect(() => v.parse(SemverSchema, 42)).toThrow();
	});
});

describe('SpecifierExactSchema', () => {
	test('accepts valid name and version', () => {
		expect(
			v.parse(SpecifierExactSchema, {
				name: 'my-pkg',
				version: '4.17.21',
			}),
		).toEqual({
			name: 'my-pkg',
			version: '4.17.21',
		});
	});

	test('rejects invalid name', () => {
		expect(() =>
			v.parse(SpecifierExactSchema, { name: '', version: '1.0.0' }),
		).toThrow();
	});

	test('rejects invalid version', () => {
		expect(() =>
			v.parse(SpecifierExactSchema, { name: 'my-pkg', version: 'abc' }),
		).toThrow();
	});
});

describe('SpecifierSchema', () => {
	test('parses name@version specifier', () => {
		const result = v.parse(SpecifierSchema, 'my-pkg@4.17.21');
		expect(result).toEqual({
			type: 'version',
			name: 'my-pkg',
			fetchSpec: '4.17.21',
		});
	});

	test('parses name@range specifier', () => {
		const result = v.parse(SpecifierSchema, 'my-pkg@^4.0.0');
		expect(result).toEqual({
			type: 'range',
			name: 'my-pkg',
			fetchSpec: '^4.0.0',
		});
	});

	test('parses name@tag specifier', () => {
		const result = v.parse(SpecifierSchema, 'my-pkg@latest');
		expect(result).toEqual({
			type: 'tag',
			name: 'my-pkg',
			fetchSpec: 'latest',
		});
	});

	test('parses bare name as range', () => {
		const result = v.parse(SpecifierSchema, 'my-pkg');
		expect(result).toEqual({
			type: 'range',
			name: 'my-pkg',
			fetchSpec: '*',
		});
	});

	test('parses scoped specifier', () => {
		const result = v.parse(SpecifierSchema, '@scope/my-pkg@1.0.0');
		expect(result).toEqual({
			type: 'version',
			name: '@scope/my-pkg',
			fetchSpec: '1.0.0',
		});
	});

	test('rejects empty string', () => {
		expect(() => v.parse(SpecifierSchema, '')).toThrow();
	});

	test('rejects non-string', () => {
		expect(() => v.parse(SpecifierSchema, 123)).toThrow();
	});

	test('rejects git specifier', () => {
		expect(() => v.parse(SpecifierSchema, 'user/repo')).toThrow();
	});
});
