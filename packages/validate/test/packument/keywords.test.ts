import { createInputPackumentVersion } from '@npm.rest/test/packument';
import { KeywordsSchema } from '../../src/packument/keywords';
import { PackumentVersionSchema } from '../../src/packument';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

describe('keywords', () => {
	it('is optional', () => {
		const version = createInputPackumentVersion('1.0.0');
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
		const result = v.parse(KeywordsSchema, ['foo', 'bar', 'foo', 'baz']);
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
		const version = createInputPackumentVersion('1.0.0');
		// @ts-expect-error tests
		version.keywords = {};
		const result = v.parse(PackumentVersionSchema, version);
		expect(result.keywords).toBeNull();

		const version2 = createInputPackumentVersion('1.0.0');
		// @ts-expect-error tests
		version.keywords = [1, {}, [3]];
		const result2 = v.parse(PackumentVersionSchema, version2);
		expect(result2.keywords).toBeNull();
	});
});
