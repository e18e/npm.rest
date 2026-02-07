import { describe, expect, it } from 'vitest';
import npa from 'npm-package-arg';
import * as v from 'valibot';
import {
	SpecifierExactSchema,
	PackageNameSchema,
	SpecifierSchema,
	SemverSchema,
} from '../src/package.ts';

describe('packageNameSchema validation', () => {
	it('accepts valid unscoped name', () => {
		expect(v.parse(PackageNameSchema, 'my-pkg')).toBe('my-pkg');
	});

	it('accepts valid scoped name', () => {
		expect(v.parse(PackageNameSchema, '@scope/my-pkg')).toBe(
			'@scope/my-pkg',
		);
	});

	// todo https://github.com/npm/validate-npm-package-name/pull/160
	it('accepts name with hyphen', () => {
		expect(v.parse(PackageNameSchema, '-')).toBe('-');
		expect(npa('-@1.2.3')).toMatchObject({
			type: 'version',
			name: '-',
			fetchSpec: '1.2.3',
		});
	});

	it('rejects empty string', () => {
		expect(() => v.parse(PackageNameSchema, '')).toThrow();
	});

	it('rejects non-string', () => {
		expect(() => v.parse(PackageNameSchema, 123)).toThrow();
	});

	it('rejects invalid name with spaces', () => {
		expect(() => v.parse(PackageNameSchema, 'bad name')).toThrow();
	});

	it('rejects name starting with a dot', () => {
		expect(() => v.parse(PackageNameSchema, '.bad')).toThrow();
	});

	it('rejects name starting with an underscore', () => {
		expect(() => v.parse(PackageNameSchema, '_bad')).toThrow();
	});
});

describe('semverSchema validation', () => {
	it('parses valid semver', () => {
		expect(v.parse(SemverSchema, '1.0.0')).toBe('1.0.0');
	});

	it('parses semver with prerelease', () => {
		expect(v.parse(SemverSchema, '1.0.0-beta.1')).toBe('1.0.0-beta.1');
	});

	it('rejects invalid semver', () => {
		expect(() => v.parse(SemverSchema, 'not-a-version')).toThrow();
	});

	it('rejects non-string', () => {
		expect(() => v.parse(SemverSchema, 42)).toThrow();
	});
});

describe('specifierExactSchema validation', () => {
	it('accepts valid name and version', () => {
		expect(
			v.parse(SpecifierExactSchema, {
				name: 'my-pkg',
				version: '4.17.21',
			}),
		).toStrictEqual({
			name: 'my-pkg',
			version: '4.17.21',
		});
	});

	it('rejects invalid name', () => {
		expect(() =>
			v.parse(SpecifierExactSchema, { name: '', version: '1.0.0' }),
		).toThrow();
	});

	it('rejects invalid version', () => {
		expect(() =>
			v.parse(SpecifierExactSchema, { name: 'my-pkg', version: 'abc' }),
		).toThrow();
	});
});

describe('specifierSchema validation', () => {
	it('parses name@version specifier', () => {
		const result = v.parse(SpecifierSchema, 'my-pkg@4.17.21');
		expect(result).toStrictEqual({
			type: 'version',
			name: 'my-pkg',
			fetchSpec: '4.17.21',
		});
	});

	it('parses name@range specifier', () => {
		const result = v.parse(SpecifierSchema, 'my-pkg@^4.0.0');
		expect(result).toStrictEqual({
			type: 'range',
			name: 'my-pkg',
			fetchSpec: '^4.0.0',
		});
	});

	it('parses name@tag specifier', () => {
		const result = v.parse(SpecifierSchema, 'my-pkg@latest');
		expect(result).toStrictEqual({
			type: 'tag',
			name: 'my-pkg',
			fetchSpec: 'latest',
		});
	});

	it('parses bare name as range', () => {
		const result = v.parse(SpecifierSchema, 'my-pkg');
		expect(result).toStrictEqual({
			type: 'range',
			name: 'my-pkg',
			fetchSpec: '*',
		});
	});

	it('parses scoped specifier', () => {
		const result = v.parse(SpecifierSchema, '@scope/my-pkg@1.0.0');
		expect(result).toStrictEqual({
			type: 'version',
			name: '@scope/my-pkg',
			fetchSpec: '1.0.0',
		});
	});

	it('rejects empty string', () => {
		expect(() => v.parse(SpecifierSchema, '')).toThrow();
	});

	it('rejects non-string', () => {
		expect(() => v.parse(SpecifierSchema, 123)).toThrow();
	});

	it('rejects git specifier', () => {
		expect(() => v.parse(SpecifierSchema, 'user/repo')).toThrow();
	});
});
