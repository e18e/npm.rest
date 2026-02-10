import * as v from 'valibot';
import {
	aliasedLiteralUnion,
	EmptyableString,
	MaybeLink,
	Link,
} from '../shared';

const REPOSITORY_TYPES = Object.freeze(['git', 'unknown'] as const);

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
	],
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

export const RepositoryObjectSchema = v.object({
	type: v.optional(
		v.fallback(
			aliasedLiteralUnion(REPOSITORY_TYPES, {
				'github*': 'git',
				'bitbucket*': 'git',
				'gitlab*': 'git',
				'gitee*': 'git',
			}),
			'unknown',
		),
		'unknown',
	),
	url: Link,
	directory: v.optional(EmptyableString),
	branch: v.optional(EmptyableString),
});

export const RepositorySchema = v.pipe(
	v.union([
		MaybeLink,
		v.array(
			v.union([
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
