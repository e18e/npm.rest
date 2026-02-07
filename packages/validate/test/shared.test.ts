import { EmptyableString, StrictString } from '../src/shared';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

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
