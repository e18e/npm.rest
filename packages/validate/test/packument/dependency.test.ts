import { createPackumentVersion } from '@npm.rest/test/packument';
import { PackumentVersionSchema } from '../../src/packument';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

describe.for([
	'dependencies' as const,
	'devDependencies' as const,
	'optionalDependencies' as const,
	'peerDependencies' as const,
	// oxlint-disable-next-line jest/valid-describe-callback todo report bug?
])('%s', (type) => {
	it('is optional', () => {
		const version = createPackumentVersion('1.0.0');
		version[type] = {};
		expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
	});

	it('is nullable', () => {
		const version = createPackumentVersion('1.0.0');
		version[type] = null;
		expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
	});

	it('becomes null when empty', () => {
		const version = createPackumentVersion('1.0.0');
		version[type] = {};
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({ [type]: null });
	});

	it('empty keys are stripped', () => {
		const version = createPackumentVersion('1.0.0');
		version[type] = { '': '1.0.0', foo: '2.0.0' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed[type]).toStrictEqual({ foo: '2.0.0' });
	});

	it('empty keys and values are stripped', () => {
		const version = createPackumentVersion('1.0.0');
		version[type] = { '': '', foo: '2.0.0' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed[type]).toStrictEqual({ foo: '2.0.0' });
	});

	it('effectively empty keys are stripped', () => {
		const version = createPackumentVersion('1.0.0');
		version[type] = { '   ': '1.0.0', foo: '2.0.0' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed[type]).toStrictEqual({ foo: '2.0.0' });
	});

	it('effectively empty keys and values are stripped', () => {
		const version = createPackumentVersion('1.0.0');
		version[type] = { '   ': '    ', foo: '2.0.0' };
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed[type]).toStrictEqual({ foo: '2.0.0' });
	});

	it('values can be empty', () => {
		const version = createPackumentVersion('1.0.0');
		version[type] = { foo: '' };
		expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
	});

	it('values become null when empty', () => {
		const version = createPackumentVersion('1.0.0');
		version[type] = { foo: '', bar: '2.0.0' };

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({
			[type]: { foo: null, bar: '2.0.0' },
		});
	});

	it('values become null when all values are null', () => {
		const version = createPackumentVersion('1.0.0');
		version[type] = { foo: null, bar: null };

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({
			[type]: null,
		});
	});

	it('turns string into null', () => {
		const version = createPackumentVersion('1.0.0');
		version[type] = 'foo';

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({
			[type]: null,
		});
	});

	it('fallsback to null when value is unparsable', () => {
		const version = createPackumentVersion('1.0.0');
		// @ts-expect-error tests
		version[type] = { foo: { bar: 'baz' }, quz: '1.0.0' };

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed[type]).toStrictEqual({
			quz: '1.0.0',
			foo: null,
		});
	});
});

describe('peerDependenciesMeta', () => {
	it('is optional', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {};
		expect(v.is(PackumentVersionSchema, version)).toBeTruthy();
	});

	it('becomes null when empty', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {};
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({ peerDependenciesMeta: null });
	});

	it('empty keys are stripped', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {
			'': { optional: false },
			foo: { optional: true },
		};

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.peerDependenciesMeta).toStrictEqual({
			foo: { optional: true },
		});
	});

	it('empty keys and values are stripped', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {
			foo: { optional: true },
			// @ts-expect-error tests
			'': '',
		};

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.peerDependenciesMeta).toStrictEqual({
			foo: { optional: true },
		});
	});

	it('effectively empty keys are stripped', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {
			'  ': { optional: false },
			foo: { optional: true },
		};

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.peerDependenciesMeta).toStrictEqual({
			foo: { optional: true },
		});
	});

	it('effectively empty keys and values are stripped', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {
			foo: { optional: true },
			// @ts-expect-error tests
			'    ': '    ',
		};

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed.peerDependenciesMeta).toStrictEqual({
			foo: { optional: true },
		});
	});

	it('strips unknown keys', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {
			// @ts-expect-error tests
			foo: { optional: true, bar: 'baz' },
		};
		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({
			peerDependenciesMeta: { foo: { optional: true } },
		});
	});

	it('maps incorrect key values to null', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {
			// @ts-expect-error tests
			foo: 'bar',
			baz: { optional: true },
		};

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({
			peerDependenciesMeta: { foo: null, baz: { optional: true } },
		});
	});

	it('maps string value to null', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {
			// @ts-expect-error tests
			foo: '^1.0.0',
			bar: { optional: true },
		};

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({
			peerDependenciesMeta: { foo: null },
		});
	});

	it('maps boolean value to null', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {
			// @ts-expect-error tests
			foo: true,
			bar: { optional: true },
		};

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({
			peerDependenciesMeta: { foo: null, bar: { optional: true } },
		});
	});

	it('maps to null when all values are null', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {
			foo: null,
			bar: null,
		};

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({
			peerDependenciesMeta: null,
		});
	});

	it('preserves correct values amongst incorrect ones', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {
			bar: { optional: false },
			// @ts-expect-error tests
			foo: true,
			baz: { optional: true },
		};

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({
			peerDependenciesMeta: {
				bar: { optional: false },
				foo: null,
				baz: { optional: true },
			},
		});
	});

	it('parses strings pretending to be booleans', () => {
		const version = createPackumentVersion('1.0.0');
		version.peerDependenciesMeta = {
			bar: { optional: 'false' },
			baz: { optional: 'true' },
		};

		const parsed = v.parse(PackumentVersionSchema, version);
		expect(parsed).toMatchObject({
			peerDependenciesMeta: {
				bar: { optional: false },
				baz: { optional: true },
			},
		});
	});
});
