import { createPackumentVersion } from '@npm.rest/test/packument';
import { PackumentVersionSchema } from '../../src/packument';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import {
	DOMAIN_REPOSITORY_TYPE_MAP,
	RepositoryObjectSchema,
	RepositorySchema,
	GIT_PROTOCOLS,
} from '../../src/packument/repository';

describe('repository', () => {
	it('parses repository object to array', () => {
		const parsed = v.parse(RepositorySchema, {
			type: 'git',
			url: 'https://github.com/owner/repo',
		});

		expect(parsed).toMatchObject([
			{
				type: 'git',
				url: 'https://github.com/owner/repo',
			},
		]);
	});

	it('parses repository string url to array', () => {
		const parsed = v.parse(
			RepositorySchema,
			'https://github.com/owner/repo',
		);

		expect(parsed).toMatchObject([
			{ url: 'https://github.com/owner/repo' },
		]);
	});

	it('parses array of string urls to array', () => {
		const parsed = v.parse(RepositorySchema, [
			'https://github.com/owner/repo',
			'https://github.com/owner/repo2',
		]);

		expect(parsed).toMatchObject([
			{ url: 'https://github.com/owner/repo' },
			{ url: 'https://github.com/owner/repo2' },
		]);
	});

	it('parses array of repo objects to array', () => {
		const parsed = v.parse(RepositorySchema, [
			{
				type: 'git',
				url: 'https://github.com/owner/repo',
				directory: null,
				branch: null,
			},
			{
				type: 'git',
				url: 'https://github.com/owner/repo2',
				directory: null,
				branch: null,
			},
		]);

		expect(parsed).toStrictEqual([
			{
				type: 'git',
				url: 'https://github.com/owner/repo',
				directory: null,
				branch: null,
			},
			{
				type: 'git',
				url: 'https://github.com/owner/repo2',
				directory: null,
				branch: null,
			},
		]);
	});

	it('url is required', () => {
		const parsed = v.safeParse(RepositoryObjectSchema, {
			directory: './foo/bar',
		});

		expect(parsed.success).toBeFalsy();
	});

	it('valid url is required', () => {
		const parsed = v.safeParse(RepositoryObjectSchema, {
			url: 'foo',
		});

		expect(parsed.success).toBeFalsy();
	});

	it('trims url before parsing', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: 'git',
			url: '   https://github.com/owner/repo   ',
		});

		expect(parsed?.url).toBe('https://github.com/owner/repo');
	});

	it('supports git type', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: 'git',
			url: 'https://github.com/owner/repo',
		});

		expect(parsed?.type).toBe('git');
	});

	it('turns type to lowercase before parsing', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: 'Git',
			url: 'https://github.com/owner/repo',
		});

		expect(parsed?.type).toBe('git');
	});

	it('trims type before parsing', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: '   git   ',
			url: 'https://github.com/owner/repo',
		});

		expect(parsed?.type).toBe('git');
	});

	it('transforms github type to git', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: 'github',
			url: 'https://github.com/owner/repo',
		});

		expect(parsed).toMatchObject({ type: 'git' });
	});

	it('transforms empty type to unknown', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: '',
			url: 'https://github.com/owner/repo',
		});

		expect(parsed?.type).toBe('unknown');
	});

	it('transforms effectively empty type to unknown', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: '   ',
			url: 'https://github.com/owner/repo',
		});

		expect(parsed?.type).toBe('unknown');
	});

	it('turns empty array to null', () => {
		const parsed = v.parse(RepositorySchema, []);
		expect(parsed).toBeNull();
	});

	it('turns unknown types to unknown', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: 'npm',
			url: 'https://github.com/owner/repo',
		});

		expect(parsed?.type).toBe('unknown');
	});

	it('turns repo that is a non-url string to null', () => {
		const parsed = v.parse(RepositorySchema, 'example/repo');
		expect(parsed).toBeNull();
	});

	it('turns url of repository object that is non-url to null', () => {
		const parsed = v.parse(RepositorySchema, { url: 'example/repo' });
		expect(parsed).toBeNull();
	});

	it('turns repository object that has non-url url to null', () => {
		const parsed = v.parse(RepositorySchema, { url: 'example/repo' });
		expect(parsed).toBeNull();
	});

	it('turns empty repository object to null', () => {
		const parsed = v.parse(RepositorySchema, {});
		expect(parsed).toBeNull();
	});

	it('turns empty branch string to null', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			branch: '',
			url: 'https://github.com/owner/repo',
		});

		expect(parsed).toMatchObject({ branch: null });
	});

	it('turns empty directory string to null', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			directory: '',
			url: 'https://github.com/owner/repo',
		});

		expect(parsed).toMatchObject({ directory: null });
	});

	it('handles array mixed validities gracefully', () => {
		const parsed = v.parse(RepositorySchema, [
			'https://github.com/owner/repo',
			{ url: 'foo' },
			{ url: 'https://example.com' },
		]);

		expect(parsed).toMatchObject([
			{ url: 'https://github.com/owner/repo' },
			{ url: 'https://example.com' },
		]);
	});

	it('discards repository object with npm url', () => {
		const parsed = v.parse(RepositorySchema, {
			url: 'https://npmjs.com/foo',
		});

		expect(parsed).toBeNull();
	});

	it('sets type to git when url pathname ends with .git', () => {
		const parsed = v.parse(RepositorySchema, {
			url: 'https://example.com/repo.git',
		});

		expect(parsed).toMatchObject([
			{
				type: 'git',
				url: 'https://example.com/repo.git',
			},
		]);
	});

	describe.for(DOMAIN_REPOSITORY_TYPE_MAP)(
		'domain type handling for %s to %s',
		// oxlint-disable-next-line jest/valid-describe-callback bug?
		([domain, type]) => {
			it('transforms when no type is given', () => {
				const version = createPackumentVersion('1.0.0');
				version.repository = { url: `https://${domain}/example` };

				const parsed = v.parse(PackumentVersionSchema, version);
				expect(parsed.repository).toMatchObject([
					{
						type: type,
						url: `https://${domain}/example`,
					},
				]);
			});

			it('transforms when conflicting type is given', () => {
				const version = createPackumentVersion('1.0.0');
				version.repository = {
					type: 'unknown',
					url: `https://${domain}/example`,
				};

				const parsed = v.parse(PackumentVersionSchema, version);
				expect(parsed.repository).toMatchObject([
					{ type: type, url: `https://${domain}/example` },
				]);
			});

			it('transforms when repository is a string', () => {
				const version = createPackumentVersion('1.0.0');
				version.repository = `https://${domain}/example`;

				const parsed = v.parse(PackumentVersionSchema, version);
				expect(parsed.repository).toMatchObject([
					{ type: type, url: `https://${domain}/example` },
				]);
			});
		},
	);

	it.for([
		['github - foo', 'git'],
		['gitlab.com', 'git'],
		['bitbucket.com', 'git'],
		['gitee.com', 'git'],
	])('parses aliased type %s to %s', ([input, expected]) => {
		const parsed = v.parse(RepositorySchema, {
			type: input,
			url: 'https://example.com',
		});

		expect(parsed).toMatchObject([
			{
				type: expected,
				url: 'https://example.com',
			},
		]);
	});

	it.for(GIT_PROTOCOLS)(
		'set type to git when the url protocol is %s',
		(protocol) => {
			const parsed = v.parse(RepositorySchema, {
				url: `${protocol}//example.com`,
			});

			expect(parsed).toMatchObject([
				{
					type: 'git',
					url: `${protocol}//example.com`,
				},
			]);
		},
	);
});
