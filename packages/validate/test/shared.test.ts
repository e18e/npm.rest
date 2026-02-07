import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import {
	EmptyableString,
	StrictString,
	Email,
	Date,
	Link,
} from '../src/shared';

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
