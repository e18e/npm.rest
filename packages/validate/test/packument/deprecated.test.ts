import { createInputPackumentVersion } from '@npm.rest/test/packument';
import { PackumentVersionSchema } from '../../src/packument';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

describe('deprecated', () => {
	it('is optional', () => {
		const version = createInputPackumentVersion('1.0.0');
		// oxlint-disable-next-line eslint/no-undefined
		version.deprecated = undefined;
		expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
	});

	it('is null when empty', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = '';
		expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
	});

	it('is null when effectively empty', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = '         ';
		expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
	});

	it('allows false', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = false;
		expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
	});

	it('allows true', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = true;
		expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
	});

	it('parses as expected', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = 'This version is deprecated';
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({
			deprecated: 'This version is deprecated',
		});
	});

	it('can be an object', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = { foo: 'This version is deprecated' };
		expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
	});

	it('handles object with empty key', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = { '': 'deprecated' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.deprecated).toBe('deprecated');
	});

	it('handles object with effectively empty key', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = { '   ': 'deprecated' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.deprecated).toBe('deprecated');
	});

	it('handles object with empty value', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = { foo: '' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.deprecated).toBe('foo');
	});

	it('handles object with effectively empty value', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = { foo: '   ' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.deprecated).toBe('foo');
	});

	it('flattens object message to string', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = { foo: 'This version is deprecated' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.deprecated).toBe('foo: This version is deprecated');
	});

	it('flattens multi key object message to string', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = {
			foo: 'This version is deprecated',
			bar: 'This version is deprecated',
		};
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.deprecated).toBe(
			'foo: This version is deprecated, bar: This version is deprecated',
		);
	});

	it('is true when unknown truthy value is given', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = { foo: { bar: 'baz' } };
		const parsed = v.parse(PackumentVersionSchema, version);
		// oxlint-disable-next-line eslint-plugin-vitest/prefer-to-be-truthy
		expect(parsed.deprecated).toBe(true);
	});

	it('is false when unknown falsy value is given', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.deprecated = 0;
		const parsed = v.parse(PackumentVersionSchema, version);
		// oxlint-disable-next-line eslint-plugin-vitest/prefer-to-be-falsy
		expect(parsed.deprecated).toBe(false);
	});
});
