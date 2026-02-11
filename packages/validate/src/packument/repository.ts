import hostedGitInfo from 'hosted-git-info';
import * as v from 'valibot';
import {
	aliasedLiteralUnion,
	EmptyableString,
	TrimmedString,
	MaybeLink,
	Link,
} from '../shared';

const REPOSITORY_TYPES = Object.freeze([
	'git',
	'mercurial',
	'unknown',
] as const);

type RepositoryType = (typeof REPOSITORY_TYPES)[number];

export const GIT_PROTOCOLS = Object.freeze([
	'git:',
	'git+ssh:',
	'git+https:',
] as const);

type GitProtocol = (typeof GIT_PROTOCOLS)[number];

function isGitProtocol(protocol: string): protocol is GitProtocol {
	return GIT_PROTOCOLS.includes(protocol as GitProtocol);
}

export const REPOSITORY_DOMAIN_MAP = Object.freeze({
	git: [
		'github.com',
		'bitbucket.org',
		'gitlab.com',
		'gitee.com',
		'git.sr.ht',
		'tangled.sh',
		'tangled.org',
		'codeberg.org',
	],
	mercurial: ['hg.sr.ht'],
} satisfies Record<Exclude<RepositoryType, 'unknown'>, string[]>);

export const DOMAIN_REPOSITORY_TYPE_MAP = Object.freeze(
	Object.entries(REPOSITORY_DOMAIN_MAP).flatMap(([type, domains]) => {
		return domains.map(
			(domain): readonly [domain: string, type: RepositoryType] => [
				domain,
				type as RepositoryType,
			],
		);
	}),
);

const RepoURL = v.pipe(
	TrimmedString,
	v.rawTransform(({ dataset, addIssue, NEVER }) => {
		const gitInfo = hostedGitInfo.fromUrl(dataset.value);
		if (!gitInfo) addIssue({ message: 'failed to parse git url' });
		return gitInfo?.https() ?? NEVER;
	}),
);

export const RepositoryObjectSchema = v.object({
	type: v.optional(
		v.fallback(
			aliasedLiteralUnion(REPOSITORY_TYPES, {
				'github*': 'git',
				'bitbucket*': 'git',
				'gitlab*': 'git',
				'gitee*': 'git',
				hg: 'mercurial',
			}),
			'unknown',
		),
		'unknown',
	),
	url: v.union([RepoURL, Link]),
	directory: v.optional(EmptyableString),
	branch: v.optional(EmptyableString),
});

export const RepositorySchema = v.pipe(
	v.union([
		RepoURL,
		MaybeLink,
		v.array(
			v.union([
				RepoURL,
				MaybeLink,
				v.fallback(v.nullable(RepositoryObjectSchema), null),
			]),
		),
		v.fallback(v.nullable(RepositoryObjectSchema), null),
	]),
	v.transform((value) => {
		if (value === null) return null;

		const array = (Array.isArray(value) ? value : [value])
			.map((raw) => {
				if (raw === null) return null;

				const item =
					typeof raw === 'string'
						? { type: 'unknown' as const, url: raw }
						: raw;

				const gitInfo = hostedGitInfo.fromUrl(item.url);

				if (gitInfo) {
					item.type = 'git';
					item.url = gitInfo.https();
					return item;
				}

				const url = new URL(item.url);

				if (url.hostname.endsWith('npmjs.com')) {
					return null;
				}

				if (
					url.pathname.endsWith('.git') ||
					isGitProtocol(url.protocol)
				) {
					item.type = 'git' as const;
					return item;
				}

				for (const [domain, type] of DOMAIN_REPOSITORY_TYPE_MAP) {
					if (url.hostname.endsWith(domain)) {
						item.type = type;
						break;
					}
				}

				return item;
			})
			.filter((item) => item !== null);

		return array.length === 0 ? null : array;
	}),
);
