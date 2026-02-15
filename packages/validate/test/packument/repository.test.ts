import { createPackumentVersion } from '@npm.rest/test/packument';
import { PackumentVersionSchema } from '../../src/packument';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import {
	DOMAIN_REPOSITORY_TYPE_MAP,
	RepositoryObjectSchema,
	REPOSITORY_DOMAIN_MAP,
	JUNK_REPO_DOMAINS,
	RepositorySchema,
	GIT_PROTOCOLS,
} from '../../src/packument/repository';

describe('repository', () => {
	it('parses repository object to array', () => {
		const parsed = v.parse(RepositorySchema, {
			type: 'unknown',
			url: 'https://git.willow.sh/owner/repo',
		});

		expect(parsed).toMatchObject([
			{
				type: 'unknown',
				url: 'https://git.willow.sh/owner/repo',
			},
		]);
	});

	it('parses repository string url to array', () => {
		const parsed = v.parse(
			RepositorySchema,
			'https://git.willow.sh/owner/repo',
		);

		expect(parsed).toMatchObject([
			{ url: 'https://git.willow.sh/owner/repo' },
		]);
	});

	it('parses array of string urls to array', () => {
		const parsed = v.parse(RepositorySchema, [
			'https://git.willow.sh/owner/repo',
			'https://git.willow.sh/owner/repo2',
		]);

		expect(parsed).toMatchObject([
			{ url: 'https://git.willow.sh/owner/repo' },
			{ url: 'https://git.willow.sh/owner/repo2' },
		]);
	});

	it('parses array of repo objects to array', () => {
		const parsed = v.parse(RepositorySchema, [
			{
				type: 'unknown',
				url: 'https://git.willow.sh/owner/repo',
				directory: null,
				branch: null,
			},
			{
				type: 'unknown',
				url: 'https://git.willow.sh/owner/repo2',
				directory: null,
				branch: null,
			},
		]);

		expect(parsed).toStrictEqual([
			{
				type: 'unknown',
				url: 'https://git.willow.sh/owner/repo',
				directory: null,
				branch: null,
			},
			{
				type: 'unknown',
				url: 'https://git.willow.sh/owner/repo2',
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
			url: '   https://git.willow.sh/owner/repo   ',
		});

		expect(parsed?.url).toBe('https://git.willow.sh/owner/repo');
	});

	it('supports git type', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: 'git',
			url: 'https://git.willow.sh/owner/repo',
		});

		expect(parsed?.type).toBe('git');
	});

	it('turns type to lowercase before parsing', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: 'Git',
			url: 'https://git.willow.sh/owner/repo',
		});

		expect(parsed?.type).toBe('git');
	});

	it('trims type before parsing', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: '   git   ',
			url: 'https://git.willow.sh/owner/repo',
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
			url: 'https://git.willow.sh/owner/repo',
		});

		expect(parsed?.type).toBe('unknown');
	});

	it('transforms effectively empty type to unknown', () => {
		const parsed = v.parse(RepositoryObjectSchema, {
			type: '   ',
			url: 'https://git.willow.sh/owner/repo',
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
			url: 'https://git.willow.sh/owner/repo',
		});

		expect(parsed?.type).toBe('unknown');
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
			'https://example.com/owner/repo',
			{ url: 'foo' },
			{ url: 'https://example.com' },
		]);

		expect(parsed).toMatchObject([
			{ url: 'https://example.com/owner/repo' },
			{ url: 'https://example.com' },
		]);
	});

	it('leaves random http url as is', () => {
		const parsed = v.parse(RepositorySchema, ['http://example.com/foo']);
		expect(parsed).toMatchObject([{ url: 'http://example.com/foo' }]);
	});

	it('sets type to git when url pathname ends with .git', () => {
		const parsed = v.parse(RepositorySchema, {
			url: 'https://example.com/repo.git',
		});

		expect(parsed).toMatchObject([{ type: 'git' }]);
	});

	it('turns repo that is a wrong url string to null', () => {
		const parsed = v.parse(RepositorySchema, 'data:foo');
		expect(parsed).toBeNull();
	});

	it('turns url that is missing a hostname to null', () => {
		const url = new URL('bar:bar/baz');
		expect(url.hostname).toBe('');

		const parsed = v.parse(RepositorySchema, url.toString());
		expect(parsed).toBeNull();
	});

	it('turns invalid url to null even when ending in .git', () => {
		const url = new URL('bar:bar/baz/repo.git');
		expect(url.hostname).toBe('');

		const parsed = v.parse(RepositorySchema, url.toString());
		expect(parsed).toBeNull();
	});

	it('turns invalid url to null even when starting in git+', () => {
		const url = new URL('git+bar:bar/baz/repo');
		expect(url.hostname).toBe('');

		const parsed = v.parse(RepositorySchema, url.toString());
		expect(parsed).toBeNull();
	});

	it('turns owner/repo string to github url', () => {
		const parsed = v.parse(RepositorySchema, { url: 'example/repo' });
		expect(parsed).toMatchObject([
			{ url: 'git+https://github.com/example/repo.git' },
		]);
	});

	it('normalises tangled.sh into tangled.org with git type', () => {
		const parsed = v.parse(RepositorySchema, {
			type: 'foo',
			url: 'https://tangled.sh/owner/repo',
		});

		expect(parsed).toMatchObject([
			{
				type: 'git',
				url: 'git+https://tangled.org/owner/repo',
			},
		]);
	});

	it('normalises random url that ends in .git', () => {
		const parsed = v.parse(RepositorySchema, {
			type: 'unknown',
			url: 'https://example.com/owner/repo.git',
		});

		expect(parsed).toMatchObject([
			{
				type: 'git',
				url: 'git+https://example.com/owner/repo.git',
			},
		]);
	});

	it('normalises random url that has git+', () => {
		const parsed = v.parse(RepositorySchema, {
			type: 'unknown',
			url: 'git+http://example.com/owner/repo',
		});

		expect(parsed).toMatchObject([
			{
				type: 'git',
				url: 'git+https://example.com/owner/repo',
			},
		]);
	});

	it('normalises random url of type git', () => {
		const parsed = v.parse(RepositorySchema, {
			type: 'git',
			url: 'https://example.com/owner/repo',
		});

		expect(parsed).toMatchObject([
			{
				type: 'git',
				url: 'git+https://example.com/owner/repo',
			},
		]);
	});

	it.skip('supports random ssh url, but currently leaves as is', () => {
		const parsed = v.parse(RepositorySchema, {
			url: 'git@example:owner/repo.git',
		});

		expect(parsed).toMatchObject([
			{
				type: 'unknown',
				url: 'git@example:owner/repo.git',
			},
		]);
	});

	it.skip('preserves branch if present in url', () => {
		const parsed = v.parse(RepositorySchema, {
			url: 'git+https://github.com/owner/repo#foo',
		});

		expect(parsed).toMatchObject([
			{
				type: 'git',
				url: 'git+https://github.com/owner/repo.git',
				branch: 'foo',
			},
		]);
	});

	describe.for(REPOSITORY_DOMAIN_MAP.git)(
		'%s git normalisation',
		// oxlint-disable-next-line jest/valid-describe-callback bug?
		(domain) => {
			it('normalises https to git+https', () => {
				const parsed = v.parse(RepositorySchema, {
					url: `https://${domain}/owner/repo`,
				});

				expect(parsed).toMatchObject([
					{
						type: 'git',
						// oxlint-disable-next-line typescript-eslint(no-unsafe-assignment)
						url: expect.stringContaining(
							`git+https://${domain}/owner/repo`,
						),
					},
				]);
			});

			it('normalises http into git+https', () => {
				const parsed = v.parse(RepositorySchema, {
					url: `http://${domain}/owner/repo`,
				});

				expect(parsed).toMatchObject([
					{
						type: 'git',
						// oxlint-disable-next-line typescript-eslint(no-unsafe-assignment)
						url: expect.stringContaining(
							`git+https://${domain}/owner/repo`,
						),
					},
				]);
			});

			it('normalises ssh into git+https', () => {
				const parsed = v.parse(RepositorySchema, {
					url: `git@${domain}:owner/repo.git`,
				});

				expect(parsed).toMatchObject([
					{
						type: 'git',
						// oxlint-disable-next-line typescript-eslint(no-unsafe-assignment)
						url: expect.stringContaining(
							`git+https://${domain}/owner/repo`,
						),
					},
				]);
			});

			it('handles repository spec', () => {
				const alias =
					// oxlint-disable-next-line eslint-plugin-jest(no-conditional-in-test)
					domain === 'git.sr.ht'
						? 'sourcehut'
						: domain.slice(0, domain.indexOf('.'));

				const parsed = v.parse(RepositorySchema, {
					url: `${alias}:owner/repo`,
				});

				expect(parsed).toMatchObject([
					{
						type: 'git',
						// oxlint-disable-next-line typescript-eslint(no-unsafe-assignment)
						url: expect.stringContaining(
							`git+https://${domain}/owner/repo`,
						),
					},
				]);
			});
		},
	);

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
				url: 'git+https://example.com/',
			},
		]);
	});

	it.for(GIT_PROTOCOLS)(
		'set type to git when the url protocol is %s',
		(protocol) => {
			const parsed = v.parse(RepositorySchema, {
				url: `${protocol}//example.com`,
			});

			expect(parsed).toMatchObject([{ type: 'git' }]);
		},
	);

	it.for(JUNK_REPO_DOMAINS)('catches junk repo domain %s', (domain) => {
		const parsed = v.parse(RepositorySchema, {
			type: 'git',
			url: `https://${domain}/example`,
		});

		expect(parsed).toBeNull();
	});
});
