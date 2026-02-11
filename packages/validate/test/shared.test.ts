import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import {
	aliasedLiteralUnion,
	EmptyableString,
	PretendBoolean,
	TrimmedString,
	EmptyableLink,
	StrictString,
	EmptyString,
	nullOnEmpty,
	MaybeLink,
	Email,
	Date,
	Link,
	toArray,
	cleanAndCollapseArray,
} from '../src/shared';

describe('trimmed string', () => {
	it('trims a string', () => {
		const result = v.parse(TrimmedString, ' hello ');
		expect(result).toBe('hello');
	});

	it('works with an empty string', () => {
		const result = v.parse(TrimmedString, '');
		expect(result).toBe('');
	});

	it('works with an effectively empty string', () => {
		const result = v.parse(TrimmedString, '   ');
		expect(result).toBe('');
	});
});

describe('strict string', () => {
	it('finds a valid string', () => {
		expect(v.is(StrictString, 'hello')).toBeTruthy();
	});

	it('fails on an empty string', () => {
		expect(v.is(StrictString, '')).toBeFalsy();
	});

	it('trims a string', () => {
		const result = v.parse(StrictString, ' hello ');
		expect(result).toBe('hello');
	});
});

describe('emptyable string', () => {
	it('finds a valid string', () => {
		expect(v.is(EmptyableString, 'hello')).toBeTruthy();
	});

	it('trims a string', () => {
		const result = v.parse(EmptyableString, ' hello ');
		expect(result).toBe('hello');
	});

	it('turns an empty string into null', () => {
		const result = v.parse(EmptyableString, '');
		expect(result).toBeNull();
	});

	it('turns an effectively empty string into null', () => {
		const result = v.parse(EmptyableString, ' ');
		expect(result).toBeNull();
	});
});

describe('empty string', () => {
	it('turns empty string to null', () => {
		const parsed = v.parse(EmptyString, '');
		expect(parsed).toBeNull();
	});

	it('turns effectively empty string to null', () => {
		const result = v.parse(EmptyString, '   ');
		expect(result).toBeNull();
	});

	it('fails to parse non-empty string', () => {
		const result = v.safeParse(EmptyString, 'hello');
		expect(result.success).toBeFalsy();
	});
});

describe('link', () => {
	it('finds a valid link', () => {
		expect(v.is(Link, 'https://example.com')).toBeTruthy();
	});

	it('fails on an invalid link', () => {
		expect(v.is(Link, 'invalid')).toBeFalsy();
	});

	it('trims a link', () => {
		const result = v.parse(Link, ' https://example.com ');
		expect(result).toBe('https://example.com');
	});

	it('fails on empty link', () => {
		expect(v.is(Link, '')).toBeFalsy();
	});
});

describe('emptyable link', () => {
	it('finds a valid link', () => {
		expect(v.is(EmptyableLink, 'https://example.com')).toBeTruthy();
	});

	it('trims a link', () => {
		const result = v.parse(EmptyableLink, ' https://example.com ');
		expect(result).toBe('https://example.com');
	});

	it('turns an empty link into null', () => {
		const result = v.parse(EmptyableLink, '');
		expect(result).toBeNull();
	});

	it('turns an effectively empty link into null', () => {
		const result = v.parse(EmptyableLink, ' ');
		expect(result).toBeNull();
	});
});

describe('maybe link', () => {
	it('finds a valid link', () => {
		expect(v.is(MaybeLink, 'https://example.com')).toBeTruthy();
	});

	it('trims a link before parsing', () => {
		const result = v.parse(MaybeLink, ' https://example.com ');
		expect(result).toBe('https://example.com');
	});

	it('turns an empty link into null', () => {
		const result = v.parse(MaybeLink, '');
		expect(result).toBeNull();
	});

	it('turns an effectively empty link into null', () => {
		const result = v.parse(MaybeLink, ' ');
		expect(result).toBeNull();
	});

	it('turns invalid link into null', () => {
		const result = v.parse(MaybeLink, 'invalid');
		expect(result).toBeNull();
	});

	it("doesn't turn non-strings to null", () => {
		const result = v.safeParse(MaybeLink, 123);
		expect(result.success).toBeFalsy();
	});
});

describe('date', () => {
	it('finds a valid date', () => {
		expect(v.is(Date, '2023-01-01')).toBeTruthy();
	});

	it('fails when invalid', () => {
		expect(v.is(Date, 'invalid')).toBeFalsy();
	});

	it('trims before parsing', () => {
		const date = new globalThis.Date();
		const result = v.parse(Date, ` ${date.toISOString()} `);
		expect(result.getTime()).toBe(date.getTime());
	});
});

describe('email', () => {
	it('works as expected', () => {
		expect(v.is(Email, 'test@example.com')).toBeTruthy();
	});

	it('fails when invalid', () => {
		expect(v.is(Email, 'invalid')).toBeFalsy();
	});

	it('trims before parsing', () => {
		const result = v.parse(Email, ' test@example.com ');
		expect(result).toBe('test@example.com');
	});
});

describe('null on empty', () => {
	const schema = nullOnEmpty(
		v.object({
			foo: v.optional(v.nullable(v.string())),
			bar: v.optional(v.nullable(v.string())),
		}),
	);

	it('works as expected', () => {
		const result = v.parse(schema, {});
		expect(result).toBeNull();
	});

	it("doesn't null when not empty", () => {
		const result = v.parse(schema, { foo: 'bar' });
		expect(result).toMatchObject({ foo: 'bar' });
	});

	it('works when array pretends to be object', () => {
		const result = v.parse(schema, []);
		expect(result).toBeNull();
	});

	it('strips when values are null', () => {
		const result = v.parse(schema, { foo: null, bar: null });
		expect(result).toBeNull();
	});

	it("doesn't strip when values are not all null", () => {
		const result = v.parse(schema, { foo: null, bar: 'imagine' });
		expect(result).toMatchObject({ foo: null, bar: 'imagine' });
	});

	it('strips when values are undefined', () => {
		// oxlint-disable-next-line eslint(no-undefined)
		const result = v.parse(schema, { foo: undefined, bar: undefined });
		// oxlint-disable-next-line eslint(no-undefined)
		expect(result).toBeNull();
	});

	it("doesn't strip when values are not all undefined", () => {
		// oxlint-disable-next-line eslint(no-undefined)
		const result = v.parse(schema, { foo: undefined, bar: 'imagine' });
		// oxlint-disable-next-line eslint(no-undefined)
		expect(result).toMatchObject({ foo: undefined, bar: 'imagine' });
	});
});

describe('pretend boolean', () => {
	it('supports real true', () => {
		const result = v.parse(PretendBoolean, true);
		// oxlint-disable-next-line vitest(prefer-to-be-truthy)
		expect(result).toBe(true);
	});

	it('supports real false', () => {
		const result = v.parse(PretendBoolean, false);
		// oxlint-disable-next-line vitest(prefer-to-be-falsy)
		expect(result).toBe(false);
	});

	it('supports pretend true', () => {
		const result = v.parse(PretendBoolean, 'true');
		// oxlint-disable-next-line vitest(prefer-to-be-truthy)
		expect(result).toBe(true);
	});

	it('supports pretend false', () => {
		const result = v.parse(PretendBoolean, 'false');
		// oxlint-disable-next-line vitest(prefer-to-be-falsy)
		expect(result).toBe(false);
	});
});

describe('aliased literal union', () => {
	it('supports non-aliased value', () => {
		const result = v.parse(aliasedLiteralUnion(['git']), 'git');
		expect(result).toBe('git');
	});

	it('supports aliased value', () => {
		const result = v.parse(
			aliasedLiteralUnion(['git'], { foo: 'git', bar: 'git' }),
			'foo',
		);

		expect(result).toBe('git');
	});

	it('trims value before parsing', () => {
		const result = v.parse(
			aliasedLiteralUnion(['git'], { foo: 'git', bar: 'git' }),
			'  foo ',
		);

		expect(result).toBe('git');
	});

	it('turns value to lowercase before parsing', () => {
		const result = v.parse(
			aliasedLiteralUnion(['git'], { foo: 'git', bar: 'git' }),
			'GIT',
		);

		expect(result).toBe('git');
	});

	it('removes spaces before parsing', () => {
		const result = v.parse(
			aliasedLiteralUnion(['buy-me-a-coffee'], {
				buymeacoffee: 'buy-me-a-coffee',
			}),
			'buy me a coffee',
		);

		expect(result).toBe('buy-me-a-coffee');
	});

	it('uses startsWith when the alias ends with *', () => {
		const result = v.parse(
			v.array(aliasedLiteralUnion(['github'], { 'github*': 'github' })),
			[
				'github - foo',
				'GitHub Sponsors ❤',
				'Github sponsor',
				'github-sponsors',
				'githubsponsors',
			],
		);

		expect(result).toStrictEqual([
			'github',
			'github',
			'github',
			'github',
			'github',
		]);
	});
});

describe('to array', () => {
	const schema = v.pipe(
		v.union([v.string(), v.array(v.string())]),
		toArray(),
	);

	it('converts single value to array', () => {
		const result = v.parse(schema, 'foo');
		expect(result).toStrictEqual(['foo']);
	});

	it('converts array to array', () => {
		const result = v.parse(schema, ['foo', 'bar']);
		expect(result).toStrictEqual(['foo', 'bar']);
	});
});

describe('clean and collapse array', () => {
	const schema = v.pipe(
		v.array(v.nullable(v.string())),
		cleanAndCollapseArray(),
	);

	it('removes null values', () => {
		const result = v.parse(schema, ['foo', null, 'bar', null]);
		expect(result).toStrictEqual(['foo', 'bar']);
	});

	it('replaces array with null when empty', () => {
		const result = v.parse(schema, []);
		expect(result).toBeNull();
	});

	it('replaces array with null when effectively empty', () => {
		const result = v.parse(schema, [null, null]);
		expect(result).toBeNull();
	});
});
