import { createInputPackumentVersion } from '@npm.rest/test/packument';
import { PackumentVersionSchema } from '../../src/packument';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import {
	DOMAIN_FUNDING_TYPE_MAP,
	FundingObjectSchema,
	FundingSchema,
} from '../../src/packument/funding';

describe('funding', () => {
	it('is nullable', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = null;
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toBeNull();
	});

	it('is optional', () => {
		const version = createInputPackumentVersion('1.0.0');
		// oxlint-disable-next-line eslint(no-undefined)
		version.funding = undefined;
		expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
	});

	it('supports url', () => {
		const parsed = v.parse(FundingObjectSchema, {
			url: 'https://example.com',
		});

		expect(parsed.url).toBe('https://example.com');
	});

	it('supports array of funding objects', () => {
		const parsed = v.parse(FundingSchema, [
			{ url: 'https://example.com' },
			{ url: 'https://foo.com' },
		]);

		expect(parsed).toMatchObject([
			{ url: 'https://example.com' },
			{ url: 'https://foo.com' },
		]);
	});

	it('turns empty array into null', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = [];
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toBeNull();
	});

	it('turns array with only null into null', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = [null];
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toBeNull();
	});

	it('turns empty object to null', () => {
		const version = createInputPackumentVersion('1.0.0');
		// @ts-expect-error tests
		version.funding = {};
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toBeNull();
	});

	it('turns empty string into null', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = '';
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toBeNull();
	});

	it('turns effectively empty string into null', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = '    ';
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toBeNull();
	});

	it('transforms single object to array', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = { url: 'https://example.com' };

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toMatchObject([{ url: 'https://example.com' }]);
	});

	it('transforms single string to object array', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = 'https://example.com';

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toMatchObject([{ url: 'https://example.com' }]);
	});

	it('returns null when invalid url is passed', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = 'invalid';
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toBeNull();

		const version2 = createInputPackumentVersion('1.0.0');
		version2.funding = { url: 'invalid' };
		const parsed2 = v.parse(PackumentVersionSchema, version2);
		expect(parsed2.funding).toBeNull();

		const version3 = createInputPackumentVersion('1.0.0');
		version3.funding = [{ url: 'invalid' }, 'invalid'];
		const parsed3 = v.parse(PackumentVersionSchema, version3);
		expect(parsed3.funding).toBeNull();
	});

	it('funding type is set to unknown when not provided', () => {
		const parsed = v.parse(FundingSchema, [
			{ url: 'https://example.com' },
			'https://foo.com',
		]);

		expect(parsed).toMatchObject([
			{ type: 'unknown', url: 'https://example.com' },
			{ type: 'unknown', url: 'https://foo.com' },
		]);
	});

	it('turns unknown funding type into unknown', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = { type: 'foo', url: 'https://example.com' };

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toStrictEqual([
			{ type: 'unknown', url: 'https://example.com' },
		]);
	});

	it('normalises funding type to lowercase before parsing', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = { type: 'GitHub', url: 'https://example.com' };

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toStrictEqual([
			{ type: 'github', url: 'https://example.com' },
		]);
	});

	it('trims funding type before parsing', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = { type: ' github ', url: 'https://example.com' };

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toStrictEqual([
			{ type: 'github', url: 'https://example.com' },
		]);
	});

	it('transforms false to null', () => {
		const versionFalse = createInputPackumentVersion('1.0.0');
		versionFalse.funding = false;
		const parsedFalse = v.parse(PackumentVersionSchema, versionFalse);
		expect(parsedFalse.funding).toBeNull();

		const versionTrue = createInputPackumentVersion('1.0.0');
		versionTrue.funding = true;
		const parsedTrue = v.parse(PackumentVersionSchema, versionTrue);
		expect(parsedTrue.funding).toBeNull();
	});

	it('supports known funding types', () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = { type: 'github', url: 'https://example.com' };

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toStrictEqual([
			{ type: 'github', url: 'https://example.com' },
		]);
	});

	it("doesn't modify the url for random sites", () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = { url: 'http://example.com?foo=bar' };

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toStrictEqual([
			{ type: 'unknown', url: 'http://example.com?foo=bar' },
		]);
	});

	it("doesn't modify the type for random sites", () => {
		const version = createInputPackumentVersion('1.0.0');
		version.funding = {
			type: 'github',
			url: 'http://example.com?foo=bar',
		};

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.funding).toStrictEqual([
			{ type: 'github', url: 'http://example.com?foo=bar' },
		]);
	});

	describe.for(DOMAIN_FUNDING_TYPE_MAP)(
		'domain type handling for %s to %s',
		// oxlint-disable-next-line jest/valid-describe-callback bug?
		([domain, type]) => {
			it('transforms when no type is given', () => {
				const version = createInputPackumentVersion('1.0.0');
				version.funding = { url: `https://${domain}/example` };

				const parsed = v.parse(PackumentVersionSchema, version);
				expect(parsed.funding).toStrictEqual([
					{ type: type, url: `https://${domain}/example` },
				]);
			});

			it('transforms when conflicting type is given', () => {
				const version = createInputPackumentVersion('1.0.0');
				version.funding = {
					// oxlint-disable-next-line eslint-plugin-jest(no-conditional-in-test) required here
					type: type === 'github' ? 'patreon' : 'github',
					url: `https://${domain}/example`,
				};

				const parsed = v.parse(PackumentVersionSchema, version);
				expect(parsed.funding).toStrictEqual([
					{ type: type, url: `https://${domain}/example` },
				]);
			});

			it('transforms when funding is a string', () => {
				const version = createInputPackumentVersion('1.0.0');
				version.funding = `https://${domain}/example`;

				const parsed = v.parse(PackumentVersionSchema, version);
				expect(parsed.funding).toStrictEqual([
					{ type: type, url: `https://${domain}/example` },
				]);
			});

			it('transforms http to https', () => {
				const version = createInputPackumentVersion('1.0.0');
				version.funding = { url: `http://${domain}/example` };

				const parsed = v.parse(PackumentVersionSchema, version);
				expect(parsed.funding).toStrictEqual([
					{ type: type, url: `https://${domain}/example` },
				]);
			});
		},
	);

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
		const parsed = v.parse(FundingObjectSchema, {
			type: input,
			url: 'https://example.com',
		});

		expect(parsed).toStrictEqual({
			type: expected,
			url: 'https://example.com',
		});
	});
});
