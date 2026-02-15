import GitHost from 'hosted-git-info';
import * as v from 'valibot';
import {
	aliasedLiteralUnion,
	EmptyableString,
	TrimmedString,
	MaybeLink,
	Link,
	toArray,
	cleanAndCollapseArray,
} from '../shared';

export const REPOSITORY_TYPES = Object.freeze([
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

export const JUNK_REPO_DOMAINS = Object.freeze([
	'npmjs.com',
	'google.com',
] as const);

function isJunkRepoDomain(url: URL): boolean {
	return JUNK_REPO_DOMAINS.some((domain) => url.hostname.endsWith(domain));
}

function addGitPlus(url: string) {
	return url.startsWith('git+') ? url : `git+${url}`;
}

function urlLooksOk(url: URL): boolean {
	return (
		!!url.hostname &&
		(isGitProtocol(url.protocol) ||
			['https:', 'http:'].includes(url.protocol))
	);
}

const RepoURL = v.pipe(
	TrimmedString,
	v.rawTransform(({ dataset, addIssue, NEVER }) => {
		const gitInfo = GitHost.fromUrl(dataset.value);
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
	toArray(),
	v.mapItems((raw) => {
		if (raw === null) return null;

		const item =
			typeof raw === 'string'
				? { type: 'unknown' as const, url: raw }
				: raw;

		const url = new URL(item.url);

		if (isJunkRepoDomain(url)) {
			return null;
		}

		if (url.protocol === 'http:') {
			url.protocol = 'https:';
		}

		if (url.protocol === 'git+http:') {
			url.protocol = 'git+https:';
		}

		if (url.hostname === 'tangled.sh') {
			url.hostname = 'tangled.org';
		}

		const gitInfo = GitHost.fromUrl(url.toString());

		if (gitInfo) {
			item.type = 'git';
			item.url = addGitPlus(gitInfo.https());
			return item;
		}

		if (
			item.type === 'git' ||
			url.pathname.endsWith('.git') ||
			isGitProtocol(url.protocol)
		) {
			if (!urlLooksOk(url)) {
				return null;
			}

			item.type = 'git' as const;
			item.url = addGitPlus(url.toString());
			return item;
		}

		for (const [domain, type] of DOMAIN_REPOSITORY_TYPE_MAP) {
			if (url.hostname.endsWith(domain)) {
				item.type = type;
				break;
			}
		}

		if (!urlLooksOk(url)) {
			return null;
		}

		return item;
	}),
	cleanAndCollapseArray(),
);

export type Repository = v.InferOutput<typeof RepositoryObjectSchema>;
